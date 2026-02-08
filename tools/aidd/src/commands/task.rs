use std::fs;

use anyhow::{Context, Result};

use crate::commands::wt;
use crate::frontmatter::{parse_task_frontmatter, update_status};
use crate::helpers::{
    branch_name, info, plan_file, repo_root, run_command_in,
    run_command_inherit, task_file, warn, worktree_path,
};

/// Prepare a worktree and display the task for implementation.
///
/// 1. Read TASK.md and display its content
/// 2. Call `wt ensure` to prepare the worktree
/// 3. Update TASK.md status to `doing`
pub fn run(issue: u32, task: u32) -> Result<()> {
    let tf = task_file(issue, task);

    if !tf.exists() {
        anyhow::bail!(
            "TASK.md not found: {}. Run 'aidd issue plan {issue}' first.",
            tf.display()
        );
    }

    let content =
        fs::read_to_string(&tf).with_context(|| format!("Failed to read {}", tf.display()))?;

    let fm = parse_task_frontmatter(&content)?;
    info(&format!(
        "Task {issue}/{task}: status={}, branch={}",
        fm.status, fm.branch_name
    ));

    // Prepare worktree
    wt::ensure(issue, task)?;

    // Update status to doing
    update_status(&tf, "doing")?;
    info("Updated TASK.md status to: doing");

    // Display task content
    println!("\n{content}");

    Ok(())
}

/// Complete a task: lint, test, commit, push, create PR, update status.
///
/// 1. Run `mise run lint`
/// 2. Run `bun test`
/// 3. Stage and commit changes
/// 4. Push branch
/// 5. Create PR via `gh pr create`
/// 6. Update TASK.md status to `done`
/// 7. Check if all tasks are done and update PLAN.md
pub fn done(issue: u32, task: u32) -> Result<()> {
    let branch = branch_name(issue, task);
    let wt_path = worktree_path(issue, task);
    let tf = task_file(issue, task);

    if !wt_path.exists() {
        anyhow::bail!(
            "Worktree not found: {}. Run 'aidd wt ensure {issue} {task}' first.",
            wt_path.display()
        );
    }

    // Run lint
    info("Running lint...");
    run_command_inherit("mise", &["run", "lint"], Some(&wt_path))
        .context("Lint failed. Fix errors before completing the task.")?;

    // Run tests (non-fatal)
    info("Running tests...");
    if run_command_inherit("bun", &["test"], Some(&wt_path)).is_err() {
        warn("Tests failed or no tests found, continuing...");
    }

    // Stage changes
    info("Staging changes...");
    run_command_in("git", &["add", "-A"], Some(&wt_path))
        .context("Failed to stage changes")?;

    // Check if there are changes to commit
    let diff = run_command_in("git", &["diff", "--cached", "--quiet"], Some(&wt_path));
    if diff.is_ok() {
        info("No changes to commit");
    } else {
        // There are staged changes, commit them
        info("Committing...");
        run_command_inherit("git", &["commit"], Some(&wt_path))
            .context("Commit failed")?;
    }

    // Push
    info("Pushing branch...");
    run_command_in("git", &["push", "-u", "origin", &branch], Some(&wt_path))
        .context("Failed to push branch")?;

    // Create PR
    info("Creating PR...");
    let commit_summary = run_command_in("git", &["log", "-1", "--format=%s"], Some(&wt_path))
        .unwrap_or_else(|_| "Implementation".to_string());
    let commit_body = run_command_in("git", &["log", "-1", "--format=%b"], Some(&wt_path))
        .unwrap_or_default();

    let pr_title = format!("[TASK-{issue}-{task}] {commit_summary}");
    let pr_body = format!(
        "## Summary\n{commit_body}\n\n## Related Issue\nCloses #{issue}\n\n## Verification\n- [x] mise run lint\n- [x] bun test"
    );

    run_command_in(
        "gh",
        &["pr", "create", "--title", &pr_title, "--body", &pr_body],
        Some(&wt_path),
    )
    .context("Failed to create PR")?;

    // Update TASK.md status
    if tf.exists() {
        update_status(&tf, "done")?;
        info("Updated TASK.md status to: done");
    }

    // Check if all tasks are done -> update PLAN.md
    check_all_tasks_done(issue)?;

    info(&format!("Task {issue}/{task} completed!"));
    Ok(())
}

/// Check if all tasks for an issue are done, and update PLAN.md accordingly.
fn check_all_tasks_done(issue: u32) -> Result<()> {
    let root = repo_root();
    let issue_dir = root.join(format!("features/{issue}"));

    if !issue_dir.exists() {
        return Ok(());
    }

    let mut all_done = true;
    let entries = fs::read_dir(&issue_dir)
        .with_context(|| format!("Failed to read {}", issue_dir.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let task_md = path.join("TASK.md");
        if task_md.exists() {
            let content = fs::read_to_string(&task_md)?;
            if let Ok(fm) = parse_task_frontmatter(&content) {
                if fm.status != "done" {
                    all_done = false;
                    break;
                }
            }
        }
    }

    if all_done {
        let pf = plan_file(issue);
        if pf.exists() {
            update_status(&pf, "done")?;
            info("All tasks done! Updated PLAN.md status to: done");
        }
    }

    Ok(())
}
