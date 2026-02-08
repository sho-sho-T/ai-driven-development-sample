use std::fs;

use anyhow::{Context, Result};

use crate::frontmatter::{parse_plan_frontmatter, parse_task_frontmatter};
use crate::helpers::{info, repo_root};

/// Display the status of all issues and tasks.
///
/// Traverses the `features/` directory, reads frontmatter from
/// PLAN.md and TASK.md files, and prints a formatted status overview.
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

        println!("Issue #{issue_num}:");

        // Read PLAN.md
        let plan_path = issue_path.join("PLAN.md");
        if plan_path.exists() {
            let content = fs::read_to_string(&plan_path).unwrap_or_default();
            let status = parse_plan_frontmatter(&content)
                .map(|fm| fm.status)
                .unwrap_or_else(|_| "unknown".to_string());
            println!("  PLAN: {status}");
        }

        // Read task directories
        let mut task_dirs: Vec<_> = fs::read_dir(&issue_path)
            .ok()
            .into_iter()
            .flatten()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();

        task_dirs.sort_by_key(|e| {
            e.file_name()
                .to_string_lossy()
                .parse::<u32>()
                .unwrap_or(u32::MAX)
        });

        for task_entry in &task_dirs {
            let task_num = task_entry.file_name().to_string_lossy().to_string();
            let task_md = task_entry.path().join("TASK.md");

            if task_md.exists() {
                let content = fs::read_to_string(&task_md).unwrap_or_default();
                let status = parse_task_frontmatter(&content)
                    .map(|fm| fm.status)
                    .unwrap_or_else(|_| "unknown".to_string());
                println!("  Task {task_num}: {status}");
            }
        }

        println!();
    }

    Ok(())
}
