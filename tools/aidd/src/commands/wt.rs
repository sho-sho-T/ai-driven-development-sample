use std::fs;

use anyhow::{Context, Result};

use crate::helpers::{
    branch_name, info, repo_root, run_command, run_command_in, run_command_inherit, supabase_ports,
    supabase_project_id, warn, worktree_path,
};

/// Create a worktree for the given issue (idempotent).
///
/// If the worktree already exists, prints its path and returns.
/// Otherwise, creates the branch and worktree, installs dependencies,
/// and copies `.env` if present.
pub fn ensure(issue: u32) -> Result<()> {
    let branch = branch_name(issue);
    let wt_path = worktree_path(issue);
    let root = repo_root();

    // Already exists?
    if wt_path.exists() {
        info(&format!("Worktree already exists: {}", wt_path.display()));
        println!("{}", wt_path.display());
        return Ok(());
    }

    info(&format!(
        "Creating worktree: {} (branch: {branch})",
        wt_path.display()
    ));

    // Ensure parent directory exists
    if let Some(parent) = wt_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }

    // Check if branch already exists
    let branch_exists = run_command("git", &["-C", &root.to_string_lossy(), "branch", "--list", &branch])
        .map(|out| !out.is_empty())
        .unwrap_or(false);

    let wt_str = wt_path.to_string_lossy().to_string();

    if branch_exists {
        run_command("git", &["-C", &root.to_string_lossy(), "worktree", "add", &wt_str, &branch])
            .context("Failed to create worktree with existing branch")?;
    } else {
        run_command("git", &[
            "-C",
            &root.to_string_lossy(),
            "worktree",
            "add",
            "-b",
            &branch,
            &wt_str,
            "main",
        ])
        .context("Failed to create worktree with new branch")?;
    }

    // Install dependencies
    info("Installing dependencies...");
    if run_command_in("mise", &["install"], Some(&wt_path)).is_err() {
        warn("mise install failed or mise not found, skipping");
    }
    run_command_in("bun", &["install"], Some(&wt_path))
        .context("Failed to run bun install")?;

    // Copy .env if it exists
    let env_src = root.join(".env");
    let env_dst = wt_path.join(".env");
    if env_src.exists() {
        fs::copy(&env_src, &env_dst).context("Failed to copy .env")?;
        info("Copied .env from root");
    }

    // Patch supabase/config.toml for isolated Supabase instance
    let config_path = wt_path.join("packages/platform/supabase/config.toml");
    if config_path.exists() {
        info("Patching supabase/config.toml for isolated instance...");
        let ports = supabase_ports(issue);
        let project_id = supabase_project_id(issue);

        let config = fs::read_to_string(&config_path)
            .context("Failed to read supabase/config.toml")?;

        let config = config
            .replace(
                "project_id = \"ai-driven-development-sample\"",
                &format!("project_id = \"{project_id}\""),
            )
            .replace("port = 54321", &format!("port = {}", ports.api))
            .replace("port = 54322", &format!("port = {}", ports.db))
            .replace("shadow_port = 54320", &format!("shadow_port = {}", ports.shadow))
            .replace("port = 54323", &format!("port = {}", ports.studio))
            .replace("port = 54324", &format!("port = {}", ports.inbucket))
            .replace("port = 54327", &format!("port = {}", ports.analytics))
            .replace("port = 54329", &format!("port = {}", ports.pooler))
            .replace("inspector_port = 8083", &format!("inspector_port = {}", ports.inspector));

        fs::write(&config_path, config)
            .context("Failed to write patched supabase/config.toml")?;

        // Start Supabase
        info("Starting Supabase...");
        run_command_inherit(
            "supabase",
            &["--workdir", "packages/platform/supabase", "start"],
            Some(&wt_path),
        )
        .context("Failed to start Supabase")?;

        // Reset DB (runs migrations + seeds)
        info("Resetting Supabase database (migrations + seed)...");
        run_command_inherit(
            "supabase",
            &["--workdir", "packages/platform/supabase", "db", "reset"],
            Some(&wt_path),
        )
        .context("Failed to reset Supabase database")?;

        // Extract anon key from supabase status
        info("Extracting Supabase anon key...");
        let status_output = run_command_in(
            "supabase",
            &["--workdir", "packages/platform/supabase", "status", "-o", "env"],
            Some(&wt_path),
        )
        .unwrap_or_default();

        let anon_key = status_output
            .lines()
            .find(|line| line.starts_with("ANON_KEY=") || line.starts_with("anon_key="))
            .and_then(|line| line.split_once('='))
            .map(|(_, v)| v.trim_matches('"').to_string())
            .unwrap_or_default();

        // Append Supabase connection info to .env
        let env_append = format!(
            "\n# Supabase (worktree-local instance)\nSUPABASE_URL=http://127.0.0.1:{}\nSUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:{}/postgres\nSUPABASE_ANON_KEY={}\n",
            ports.api, ports.db, anon_key,
        );

        use std::io::Write;
        let mut env_file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&env_dst)
            .context("Failed to open .env for appending")?;
        env_file
            .write_all(env_append.as_bytes())
            .context("Failed to append Supabase config to .env")?;

        info("Supabase instance ready");
    }

    info(&format!("Worktree ready: {}", wt_path.display()));
    println!("{}", wt_path.display());
    Ok(())
}

/// Remove a worktree and clean up its branch.
pub fn remove(issue: u32) -> Result<()> {
    let branch = branch_name(issue);
    let wt_path = worktree_path(issue);
    let root = repo_root();

    if wt_path.exists() {
        // Stop Supabase if config exists
        let config_path = wt_path.join("packages/platform/supabase/config.toml");
        if config_path.exists() {
            info("Stopping Supabase...");
            if let Err(e) = run_command_in(
                "supabase",
                &["--workdir", "packages/platform/supabase", "stop"],
                Some(&wt_path),
            ) {
                warn(&format!("Failed to stop Supabase: {e}"));
            }
        }

        info(&format!("Removing worktree: {}", wt_path.display()));
        run_command("git", &[
            "-C",
            &root.to_string_lossy(),
            "worktree",
            "remove",
            &wt_path.to_string_lossy(),
            "--force",
        ])
        .context("Failed to remove worktree")?;
    } else {
        info(&format!("Worktree does not exist: {}", wt_path.display()));
    }

    // Delete local branch if merged
    let branch_exists = run_command("git", &["-C", &root.to_string_lossy(), "branch", "--list", &branch])
        .map(|out| !out.is_empty())
        .unwrap_or(false);

    if branch_exists {
        info(&format!("Deleting branch: {branch}"));
        if run_command("git", &["-C", &root.to_string_lossy(), "branch", "-d", &branch]).is_err() {
            warn(&format!(
                "Branch {branch} not fully merged. Use 'git branch -D {branch}' to force delete."
            ));
        }
    }

    Ok(())
}
