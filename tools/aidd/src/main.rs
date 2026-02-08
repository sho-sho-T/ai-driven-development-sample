mod cli;
mod commands;
mod frontmatter;
mod helpers;

use std::process;

use anyhow::Result;
use clap::Parser;

use cli::{Cli, Commands, IssueAction, PrAction, TaskAction, WtAction};

fn main() {
    let cli = Cli::parse();

    if let Err(err) = run(cli) {
        eprintln!("ERROR: {err:#}");
        process::exit(1);
    }
}

fn run(cli: Cli) -> Result<()> {
    match cli.command {
        Commands::Wt { action } => match action {
            WtAction::Ensure { issue, task } => commands::wt::ensure(issue, task),
            WtAction::Remove { issue, task } => commands::wt::remove(issue, task),
        },
        Commands::Issue { action } => match action {
            IssueAction::Plan { issue } => commands::issue::plan(issue),
        },
        Commands::Task { action } => match action {
            TaskAction::Run { issue, task } => commands::task::run(issue, task),
            TaskAction::Done { issue, task } => commands::task::done(issue, task),
        },
        Commands::Pr { action } => match action {
            PrAction::Create { issue, task } => commands::pr::create(issue, task),
        },
        Commands::Status => commands::status::show(),
    }
}
