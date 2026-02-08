use std::fs;

use anyhow::{Context, Result};

use crate::helpers::{
    branch_name, info, repo_root, run_command, run_command_in, warn, worktree_path,
};

/// Create a worktree for the given issue/task pair (idempotent).
///
/// If the worktree already exists, prints its path and returns.
/// Otherwise, creates the branch and worktree, installs dependencies,
/// and copies `.env` if present.
pub fn ensure(issue: u32, task: u32) -> Result<()> {
    let branch = branch_name(issue, task);
    let wt_path = worktree_path(issue, task);
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
    if env_src.exists() {
        let env_dst = wt_path.join(".env");
        fs::copy(&env_src, &env_dst).context("Failed to copy .env")?;
        info("Copied .env from root");
    }

    info(&format!("Worktree ready: {}", wt_path.display()));
    println!("{}", wt_path.display());
    Ok(())
}

/// Remove a worktree and clean up its branch.
pub fn remove(issue: u32, task: u32) -> Result<()> {
    let branch = branch_name(issue, task);
    let wt_path = worktree_path(issue, task);
    let root = repo_root();

    if wt_path.exists() {
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
