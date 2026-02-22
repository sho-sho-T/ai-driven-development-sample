use std::fs;

use anyhow::{Context, Result};

use crate::frontmatter::parse_plan_frontmatter;
use crate::helpers::{info, repo_root};

/// Display the status of all issues.
///
/// Traverses the `features/` directory, reads frontmatter from
/// PLAN.md files, and prints a formatted status overview.
pub fn show() -> Result<()> {
    info("=== AI-Driven Development Status ===");
    println!();

    let root = repo_root();
    let features_dir = root.join("features");

    if !features_dir.exists() {
        println!("No features found.");
        return Ok(());
    }

    let mut issue_dirs: Vec<_> = fs::read_dir(&features_dir)
        .with_context(|| format!("Failed to read {}", features_dir.display()))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .collect();

    issue_dirs.sort_by_key(|e| {
        e.file_name()
            .to_string_lossy()
            .parse::<u32>()
            .unwrap_or(u32::MAX)
    });

    if issue_dirs.is_empty() {
        println!("No features found.");
        return Ok(());
    }

    for entry in &issue_dirs {
        let issue_num = entry.file_name().to_string_lossy().to_string();
        let issue_path = entry.path();

        // Read PLAN.md
        let plan_path = issue_path.join("PLAN.md");
        if plan_path.exists() {
            let content = fs::read_to_string(&plan_path).unwrap_or_default();
            let fm = parse_plan_frontmatter(&content);
            let status = fm.map(|f| f.status).unwrap_or_else(|_| "unknown".to_string());
            let title = {
                let c = fs::read_to_string(&plan_path).unwrap_or_default();
                parse_plan_frontmatter(&c).map(|f| f.title).unwrap_or_default()
            };
            println!("Issue #{issue_num}: [{status}] {title}");
        } else {
            println!("Issue #{issue_num}: (no PLAN.md)");
        }
    }

    println!();
    Ok(())
}
