use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "aidd", about = "AI-Driven Development CLI")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// Enable verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Worktree management
    Wt {
        #[command(subcommand)]
        action: WtAction,
    },
    /// Issue planning
    Issue {
        #[command(subcommand)]
        action: IssueAction,
    },
    /// Task execution
    Task {
        #[command(subcommand)]
        action: TaskAction,
    },
    /// Pull request operations
    Pr {
        #[command(subcommand)]
        action: PrAction,
    },
    /// Show status of all issues and tasks
    Status,
}

#[derive(Subcommand)]
pub enum WtAction {
    /// Create worktree + branch + install deps (idempotent)
    Ensure {
        /// Issue number
        issue: u32,
        /// Task number
        task: u32,
    },
    /// Remove worktree + clean up branch
    Remove {
        /// Issue number
        issue: u32,
        /// Task number
        task: u32,
    },
}

#[derive(Subcommand)]
pub enum IssueAction {
    /// Generate PLAN.md and TASK.md files from a GitHub issue
    Plan {
        /// Issue number
        issue: u32,
    },
}

#[derive(Subcommand)]
pub enum TaskAction {
    /// Prepare worktree and start working on a task
    Run {
        /// Issue number
        issue: u32,
        /// Task number
        task: u32,
    },
    /// Lint + test + commit + push + create PR
    Done {
        /// Issue number
        issue: u32,
        /// Task number
        task: u32,
    },
}

#[derive(Subcommand)]
pub enum PrAction {
    /// Push branch and create a pull request
    Create {
        /// Issue number
        issue: u32,
        /// Task number
        task: u32,
    },
}
