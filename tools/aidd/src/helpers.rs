use std::path::PathBuf;
use std::process::Command;

use anyhow::{Context, Result};

/// Generate the branch name for an issue.
pub fn branch_name(issue: u32) -> String {
    format!("feat/issue-{issue}")
}

/// Generate the worktree path for an issue.
pub fn worktree_path(issue: u32) -> PathBuf {
    repo_root().join(format!(".worktrees/issue-{issue}"))
}

/// Generate the PLAN.md path for an issue.
pub fn plan_file(issue: u32) -> PathBuf {
    repo_root().join(format!("features/{issue}/PLAN.md"))
}

/// Generate the features directory path for an issue.
pub fn features_dir(issue: u32) -> PathBuf {
    repo_root().join(format!("features/{issue}"))
}

/// Get the repository root directory.
///
/// Uses `git rev-parse --show-toplevel` to find the root, falling back
/// to walking up from the current executable's directory.
pub fn repo_root() -> PathBuf {
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let root = String::from_utf8_lossy(&out.stdout).trim().to_string();
            PathBuf::from(root)
        }
        _ => {
            // Fallback: walk up from current dir
            std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
        }
    }
}

/// Run an external command and return its stdout as a String.
pub fn run_command(program: &str, args: &[&str]) -> Result<String> {
    run_command_in(program, args, None)
}

/// Run an external command in a specific directory and return its stdout.
pub fn run_command_in(program: &str, args: &[&str], dir: Option<&PathBuf>) -> Result<String> {
    let mut cmd = Command::new(program);
    cmd.args(args);
    if let Some(d) = dir {
        cmd.current_dir(d);
    }

    let output = cmd
        .output()
        .with_context(|| format!("Failed to execute '{program}'. Is it installed?"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!(
            "Command '{} {}' failed (exit {}):\n{}",
            program,
            args.join(" "),
            output.status.code().unwrap_or(-1),
            stderr.trim()
        );
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Run an external command, inheriting stdin/stdout/stderr for interactive use.
pub fn run_command_inherit(program: &str, args: &[&str], dir: Option<&PathBuf>) -> Result<()> {
    let mut cmd = Command::new(program);
    cmd.args(args);
    if let Some(d) = dir {
        cmd.current_dir(d);
    }
    cmd.stdin(std::process::Stdio::inherit())
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit());

    let status = cmd
        .status()
        .with_context(|| format!("Failed to execute '{program}'. Is it installed?"))?;

    if !status.success() {
        anyhow::bail!(
            "Command '{} {}' failed (exit {})",
            program,
            args.join(" "),
            status.code().unwrap_or(-1)
        );
    }

    Ok(())
}

/// Print an info message.
pub fn info(msg: &str) {
    eprintln!("INFO: {msg}");
}

/// Print a warning message.
pub fn warn(msg: &str) {
    eprintln!("WARN: {msg}");
}

/// Port configuration for a per-worktree Supabase instance.
pub struct SupabasePorts {
    pub api: u32,
    pub db: u32,
    pub shadow: u32,
    pub studio: u32,
    pub inbucket: u32,
    pub analytics: u32,
    pub pooler: u32,
    pub inspector: u32,
}

/// Calculate Supabase ports for a given issue.
///
/// Each worktree gets a unique offset (`issue * 100`) applied
/// to the default Supabase ports so that multiple instances can run in parallel.
pub fn supabase_ports(issue: u32) -> SupabasePorts {
    let offset = issue * 100;
    SupabasePorts {
        api: 54321 + offset,
        db: 54322 + offset,
        shadow: 54320 + offset,
        studio: 54323 + offset,
        inbucket: 54324 + offset,
        analytics: 54327 + offset,
        pooler: 54329 + offset,
        inspector: 8083 + offset,
    }
}

/// Generate the Supabase project_id for a given issue.
pub fn supabase_project_id(issue: u32) -> String {
    format!("ai-driven-development-sample-i{issue}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_branch_name() {
        assert_eq!(branch_name(1), "feat/issue-1");
        assert_eq!(branch_name(42), "feat/issue-42");
    }

    #[test]
    fn test_worktree_path_ends_correctly() {
        let path = worktree_path(3);
        assert!(path.ends_with(".worktrees/issue-3"));
    }

    #[test]
    fn test_plan_file_path() {
        let path = plan_file(1);
        assert!(path.ends_with("features/1/PLAN.md"));
    }

    #[test]
    fn test_features_dir_path() {
        let path = features_dir(1);
        assert!(path.ends_with("features/1"));
    }

    #[test]
    fn test_supabase_ports_issue1() {
        let ports = supabase_ports(1);
        // offset = 1*100 = 100
        assert_eq!(ports.api, 54421);
        assert_eq!(ports.db, 54422);
        assert_eq!(ports.shadow, 54420);
        assert_eq!(ports.studio, 54423);
        assert_eq!(ports.inbucket, 54424);
        assert_eq!(ports.analytics, 54427);
        assert_eq!(ports.pooler, 54429);
        assert_eq!(ports.inspector, 8183);
    }

    #[test]
    fn test_supabase_ports_issue2() {
        let ports = supabase_ports(2);
        // offset = 2*100 = 200
        assert_eq!(ports.api, 54521);
        assert_eq!(ports.db, 54522);
        assert_eq!(ports.shadow, 54520);
        assert_eq!(ports.studio, 54523);
        assert_eq!(ports.inbucket, 54524);
        assert_eq!(ports.analytics, 54527);
        assert_eq!(ports.pooler, 54529);
        assert_eq!(ports.inspector, 8283);
    }

    #[test]
    fn test_supabase_project_id() {
        assert_eq!(
            supabase_project_id(1),
            "ai-driven-development-sample-i1"
        );
        assert_eq!(
            supabase_project_id(42),
            "ai-driven-development-sample-i42"
        );
    }
}
