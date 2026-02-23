use anyhow::{Context, Result};

use crate::helpers::{branch_name, info, run_command_in, worktree_path};

/// Push branch and create a pull request.
pub fn create(issue: u32) -> Result<()> {
    let branch = branch_name(issue);
    let wt_path = worktree_path(issue);

    let work_dir = if wt_path.exists() {
        wt_path
    } else {
        std::env::current_dir().context("Failed to get current directory")?
    };

    // Push
    info("Pushing branch...");
    run_command_in("git", &["push", "-u", "origin", &branch], Some(&work_dir))
        .context("Failed to push branch")?;

    // Create PR
    info("Creating PR...");
    let commit_summary = run_command_in("git", &["log", "-1", "--format=%s"], Some(&work_dir))
        .unwrap_or_else(|_| "Implementation".to_string());
    let commit_body = run_command_in("git", &["log", "-1", "--format=%b"], Some(&work_dir))
        .unwrap_or_default();

    let pr_title = format!("[ISSUE-{issue}] {commit_summary}");
    let pr_body = format!(
        "## Summary\n{commit_body}\n\n## Related Issue\nCloses #{issue}"
    );

    let output = run_command_in(
        "gh",
        &["pr", "create", "--title", &pr_title, "--body", &pr_body],
        Some(&work_dir),
    )
    .context("Failed to create PR")?;

    println!("{output}");
    info("PR created!");
    Ok(())
}
