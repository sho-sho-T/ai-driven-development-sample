use std::fs;

use anyhow::{Context, Result};
use serde::Deserialize;

use crate::helpers::{features_dir, info, plan_file, repo_root, run_command, task_dir};

#[derive(Debug, Deserialize)]
struct GhIssue {
    #[allow(dead_code)]
    number: u32,
    title: String,
    body: Option<String>,
}

/// Generate PLAN.md and TASK.md files from a GitHub issue.
///
/// Fetches the issue via `gh issue view`, extracts task items from
/// checkboxes in the body, and generates feature files from templates.
pub fn plan(issue: u32) -> Result<()> {
    info(&format!("Fetching issue #{issue}..."));

    let json_str = run_command("gh", &[
        "issue",
        "view",
        &issue.to_string(),
        "--json",
        "number,title,body",
    ])
    .context("Failed to fetch issue. Is `gh` authenticated?")?;

    let gh_issue: GhIssue =
        serde_json::from_str(&json_str).context("Failed to parse issue JSON")?;

    let body = gh_issue.body.unwrap_or_default();
    let tasks = extract_tasks(&body);

    if tasks.is_empty() {
        anyhow::bail!(
            "No task items found in issue #{issue} body. \
             Add checklist items (- [ ] ...) to the issue body."
        );
    }

    info(&format!("Found {} tasks in issue #{issue}", tasks.len()));

    // Create features directory
    let feat_dir = features_dir(issue);
    fs::create_dir_all(&feat_dir)
        .with_context(|| format!("Failed to create {}", feat_dir.display()))?;

    // Generate PLAN.md
    let plan_content = generate_plan(&gh_issue.title, issue, &tasks);
    let pf = plan_file(issue);
    fs::write(&pf, plan_content)
        .with_context(|| format!("Failed to write {}", pf.display()))?;
    info(&format!("Generated: {}", pf.display()));

    // Generate TASK.md for each task
    for (i, task_desc) in tasks.iter().enumerate() {
        let task_num = (i + 1) as u32;
        let td = task_dir(issue, task_num);
        fs::create_dir_all(&td)
            .with_context(|| format!("Failed to create {}", td.display()))?;

        let task_content = generate_task(issue, task_num, task_desc);
        let tf = td.join("TASK.md");
        fs::write(&tf, task_content)
            .with_context(|| format!("Failed to write {}", tf.display()))?;
        info(&format!("Generated: {}", tf.display()));
    }

    info(&format!(
        "Plan generated: {} tasks for issue #{issue}",
        tasks.len()
    ));

    Ok(())
}

/// Extract task descriptions from checkbox items in the issue body.
fn extract_tasks(body: &str) -> Vec<String> {
    body.lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.starts_with("- [ ] ") || trimmed.starts_with("- [x] ") {
                Some(trimmed[6..].trim().to_string())
            } else {
                None
            }
        })
        .filter(|s| !s.is_empty())
        .collect()
}

/// Generate PLAN.md content from template.
fn generate_plan(title: &str, issue: u32, tasks: &[String]) -> String {
    let root = repo_root();
    let template_path = root.join(".agent/templates/PLAN.md");

    // Try to read template; if unavailable, use embedded default
    let _template = fs::read_to_string(&template_path).ok();

    let now = chrono_like_now();

    let mut task_table = String::new();
    for (i, desc) in tasks.iter().enumerate() {
        let num = i + 1;
        let estimate = if desc.len() > 50 { "M" } else { "S" };
        task_table.push_str(&format!(
            "| {num} | {desc} | feat/issue-{issue}-task-{num} | {estimate} |\n"
        ));
    }

    format!(
        r#"---
issueNumber: {issue}
title: "{title}"
status: draft
ownerAgent: claude
createdAt: {now}
---

# Goal
{title}

# Scope
See individual task definitions in `features/{issue}/*/TASK.md`.

# Task Breakdown
| # | タスク概要 | ブランチ名 | 見積 |
|---|-----------|-----------|------|
{task_table}
# Risks
<!-- 実装上のリスクと対策 -->

# Definition of Done
- [ ] すべての Task が done
- [ ] lint/test パス
- [ ] PR レビュー済み
"#
    )
}

/// Generate TASK.md content for a single task.
fn generate_task(issue: u32, task: u32, description: &str) -> String {
    format!(
        r#"---
issueNumber: {issue}
taskNumber: {task}
status: todo
branchName: feat/issue-{issue}-task-{task}
worktreePath: .worktrees/issue-{issue}-task-{task}
---

# Context
{description}

# Implementation Steps
1. Analyze requirements from the task description
2. Implement the changes
3. Add tests where applicable

# Files to Change
- TBD (to be determined during implementation)

# Verification
- [ ] `mise run lint` パス
- [ ] `bun test` パス（該当テストがある場合）
- [ ] 手動確認項目（該当する場合）

# Commit Plan
- `feat(issue-{issue}): task {task} - {description}`
"#
    )
}

/// Simple ISO-8601 timestamp without external crates.
fn chrono_like_now() -> String {
    // Use the `date` command as a simple approach
    run_command("date", &["-u", "+%Y-%m-%dT%H:%M:%SZ"]).unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tasks_checkboxes() {
        let body = r#"
## Tasks
- [ ] Set up project structure
- [ ] Implement core logic
- [x] Write documentation
- Not a task
- [ ] Add tests
"#;
        let tasks = extract_tasks(body);
        assert_eq!(tasks.len(), 4);
        assert_eq!(tasks[0], "Set up project structure");
        assert_eq!(tasks[1], "Implement core logic");
        assert_eq!(tasks[2], "Write documentation");
        assert_eq!(tasks[3], "Add tests");
    }

    #[test]
    fn test_extract_tasks_empty() {
        let body = "No checkboxes here.";
        let tasks = extract_tasks(body);
        assert!(tasks.is_empty());
    }

    #[test]
    fn test_generate_task_content() {
        let content = generate_task(1, 2, "Implement feature X");
        assert!(content.contains("issueNumber: 1"));
        assert!(content.contains("taskNumber: 2"));
        assert!(content.contains("status: todo"));
        assert!(content.contains("Implement feature X"));
    }
}
