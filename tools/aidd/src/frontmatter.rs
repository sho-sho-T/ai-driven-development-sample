use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

const FRONTMATTER_DELIMITER: &str = "---";

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

/// Parse PLAN.md frontmatter from file content.
pub fn parse_plan_frontmatter(content: &str) -> Result<PlanFrontmatter> {
    let (yaml, _) =
        split_frontmatter(content).context("No frontmatter found in PLAN.md")?;
    serde_yaml::from_str(yaml).context("Failed to parse PLAN.md frontmatter")
}


#[cfg(test)]
mod tests {
    use super::*;

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
        let (yaml, body) = split_frontmatter(SAMPLE_PLAN).unwrap();
        assert!(yaml.contains("issueNumber: 1"));
        assert!(yaml.contains("status: draft"));
        assert!(body.contains("# Goal"));
    }

    #[test]
    fn test_parse_plan_frontmatter() {
        let fm = parse_plan_frontmatter(SAMPLE_PLAN).unwrap();
        assert_eq!(fm.issue_number, 1);
        assert_eq!(fm.title, "Test Plan");
        assert_eq!(fm.status, "draft");
    }

    #[test]
    fn test_no_frontmatter() {
        let content = "# Just a heading\nNo frontmatter here.";
        assert!(split_frontmatter(content).is_none());
        assert!(parse_plan_frontmatter(content).is_err());
    }
}
