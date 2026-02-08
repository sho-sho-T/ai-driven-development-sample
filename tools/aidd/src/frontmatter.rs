use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

const FRONTMATTER_DELIMITER: &str = "---";

/// Parsed frontmatter from a TASK.md file.
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskFrontmatter {
    pub issue_number: u32,
    pub task_number: u32,
    pub status: String,
    pub branch_name: String,
    pub worktree_path: String,
}

/// Parsed frontmatter from a PLAN.md file.
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanFrontmatter {
    pub issue_number: u32,
    pub title: String,
    pub status: String,
    pub owner_agent: String,
    pub created_at: String,
}

/// Split a markdown file into frontmatter (YAML) and body.
///
/// Returns `(frontmatter_yaml, body)`.
pub fn split_frontmatter(content: &str) -> Option<(&str, &str)> {
    let content = content.trim_start();
    if !content.starts_with(FRONTMATTER_DELIMITER) {
        return None;
    }

    let after_first = &content[FRONTMATTER_DELIMITER.len()..];
    let after_first = after_first.strip_prefix('\n').unwrap_or(after_first);

    let end_pos = after_first.find(&format!("\n{FRONTMATTER_DELIMITER}"))?;
    let yaml = &after_first[..end_pos];
    let rest = &after_first[end_pos + 1 + FRONTMATTER_DELIMITER.len()..];
    let body = rest.strip_prefix('\n').unwrap_or(rest);

    Some((yaml, body))
}

/// Parse TASK.md frontmatter from file content.
pub fn parse_task_frontmatter(content: &str) -> Result<TaskFrontmatter> {
    let (yaml, _) =
        split_frontmatter(content).context("No frontmatter found in TASK.md")?;
    serde_yaml::from_str(yaml).context("Failed to parse TASK.md frontmatter")
}

/// Parse PLAN.md frontmatter from file content.
pub fn parse_plan_frontmatter(content: &str) -> Result<PlanFrontmatter> {
    let (yaml, _) =
        split_frontmatter(content).context("No frontmatter found in PLAN.md")?;
    serde_yaml::from_str(yaml).context("Failed to parse PLAN.md frontmatter")
}

/// Update the `status` field in a frontmatter-bearing markdown file.
pub fn update_status(path: &Path, new_status: &str) -> Result<()> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read {}", path.display()))?;

    let updated = update_status_in_content(&content, new_status)?;

    fs::write(path, updated)
        .with_context(|| format!("Failed to write {}", path.display()))?;

    Ok(())
}

/// Update the status field in frontmatter content, returning the new content.
fn update_status_in_content(content: &str, new_status: &str) -> Result<String> {
    let (yaml, body) =
        split_frontmatter(content).context("No frontmatter found")?;

    let mut lines: Vec<String> = yaml.lines().map(String::from).collect();
    let mut found = false;
    for line in &mut lines {
        if line.starts_with("status:") {
            *line = format!("status: {new_status}");
            found = true;
            break;
        }
    }

    if !found {
        anyhow::bail!("No 'status:' field found in frontmatter");
    }

    Ok(format!(
        "{FRONTMATTER_DELIMITER}\n{}\n{FRONTMATTER_DELIMITER}\n{body}",
        lines.join("\n")
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_TASK: &str = r#"---
issueNumber: 1
taskNumber: 2
status: todo
branchName: feat/issue-1-task-2
worktreePath: .worktrees/issue-1-task-2
---

# Context
Some context here.
"#;

    const SAMPLE_PLAN: &str = r#"---
issueNumber: 1
title: "Test Plan"
status: draft
ownerAgent: claude
createdAt: 2026-01-01T00:00:00Z
---

# Goal
Some goal.
"#;

    #[test]
    fn test_split_frontmatter() {
        let (yaml, body) = split_frontmatter(SAMPLE_TASK).unwrap();
        assert!(yaml.contains("issueNumber: 1"));
        assert!(yaml.contains("status: todo"));
        assert!(body.contains("# Context"));
    }

    #[test]
    fn test_parse_task_frontmatter() {
        let fm = parse_task_frontmatter(SAMPLE_TASK).unwrap();
        assert_eq!(fm.issue_number, 1);
        assert_eq!(fm.task_number, 2);
        assert_eq!(fm.status, "todo");
        assert_eq!(fm.branch_name, "feat/issue-1-task-2");
    }

    #[test]
    fn test_parse_plan_frontmatter() {
        let fm = parse_plan_frontmatter(SAMPLE_PLAN).unwrap();
        assert_eq!(fm.issue_number, 1);
        assert_eq!(fm.title, "Test Plan");
        assert_eq!(fm.status, "draft");
    }

    #[test]
    fn test_update_status_in_content() {
        let updated = update_status_in_content(SAMPLE_TASK, "doing").unwrap();
        assert!(updated.contains("status: doing"));
        assert!(!updated.contains("status: todo"));
        assert!(updated.contains("# Context"));
    }

    #[test]
    fn test_no_frontmatter() {
        let content = "# Just a heading\nNo frontmatter here.";
        assert!(split_frontmatter(content).is_none());
        assert!(parse_task_frontmatter(content).is_err());
    }
}
