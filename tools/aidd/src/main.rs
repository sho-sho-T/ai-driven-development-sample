mod cli;
mod commands;
mod frontmatter;
mod helpers;

use std::process;

use anyhow::Result;
use clap::Parser;

use cli::{Cli, Commands, IssueAction, PrAction, WtAction};

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
            WtAction::Ensure { issue } => commands::wt::ensure(issue),
            WtAction::Remove { issue } => commands::wt::remove(issue),
        },
        Commands::Issue { action } => match action {
            IssueAction::Plan { issue } => commands::issue::plan(issue),
        },
        Commands::Pr { action } => match action {
            PrAction::Create { issue } => commands::pr::create(issue),
        },
        Commands::Status => commands::status::show(),
        Commands::Deploy => commands::deploy::run(),
    }
}
