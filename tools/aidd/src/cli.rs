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
    /// Pull request operations
    Pr {
        #[command(subcommand)]
        action: PrAction,
    },
    /// Show status of all issues
    Status,
    /// Deploy Supabase migrations and TanStack Start to Cloudflare Workers
    Deploy,
}

#[derive(Subcommand)]
pub enum WtAction {
    /// Create worktree + branch + install deps (idempotent)
    Ensure {
        /// Issue number
        issue: u32,
    },
    /// Remove worktree + clean up branch
    Remove {
        /// Issue number
        issue: u32,
    },
}

#[derive(Subcommand)]
pub enum IssueAction {
    /// Generate PLAN.md from a GitHub issue
    Plan {
        /// Issue number
        issue: u32,
    },
}

#[derive(Subcommand)]
pub enum PrAction {
    /// Push branch and create a pull request
    Create {
        /// Issue number
        issue: u32,
    },
}
