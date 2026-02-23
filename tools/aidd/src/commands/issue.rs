use std::fs;

use anyhow::{Context, Result};
use serde::Deserialize;

use crate::helpers::{features_dir, info, plan_file, repo_root, run_command};

#[derive(Debug, Deserialize)]
struct GhIssue {
    #[allow(dead_code)]
    number: u32,
    title: String,
    body: Option<String>,
}

/// Generate PLAN.md from a GitHub issue.
///
/// Fetches the issue via `gh issue view`, extracts task items from
/// checkboxes in the body, and generates a PLAN.md from a template.
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

    info(&format!(
        "Found {} task items in issue #{issue}",
        tasks.len()
    ));

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
        task_table.push_str(&format!("| {num} | {desc} | {estimate} |\n"));
    }

    let task_section = if task_table.is_empty() {
        String::new()
    } else {
        format!(
            "# Task Breakdown\n| # | タスク概要 | 見積 |\n|---|-----------|------|\n{task_table}\n"
        )
    };

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
Issue #{issue} の実装スコープ。

{task_section}# Risks
<!-- 実装上のリスクと対策 -->

# Definition of Done
- [ ] lint/test パス
- [ ] PR レビュー済み
"#
    )
}

/// Simple ISO-8601 timestamp without external crates.
fn chrono_like_now() -> String {
    run_command("date", &["-u", "+%Y-%m-%dT%H:%M:%SZ"])
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
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
    fn test_generate_plan_with_tasks() {
        let content = generate_plan("My Feature", 1, &["Task A".to_string(), "Task B".to_string()]);
        assert!(content.contains("issueNumber: 1"));
        assert!(content.contains("My Feature"));
        assert!(content.contains("Task A"));
        assert!(content.contains("Task B"));
    }

    #[test]
    fn test_generate_plan_without_tasks() {
        let content = generate_plan("My Feature", 2, &[]);
        assert!(content.contains("issueNumber: 2"));
        assert!(!content.contains("Task Breakdown"));
    }
}
