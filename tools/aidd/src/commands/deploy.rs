use anyhow::Result;

use crate::helpers::{info, repo_root, run_command_inherit};

/// Deploy Supabase migrations and TanStack Start app to Cloudflare Workers.
///
/// Steps:
/// 1. Push database migrations to Supabase Cloud
/// 2. Build the TanStack Start app with Cloudflare preset
/// 3. Deploy to Cloudflare Workers via wrangler
pub fn run() -> Result<()> {
    let root = repo_root();
    let web_dir = root.join("apps/web");

    info("Step 1/3: Pushing database migrations to Supabase Cloud...");
    run_command_inherit(
        "supabase",
        &["--workdir", "packages/platform/supabase", "db", "push"],
        Some(&root),
    )?;

    info("Step 2/3: Building TanStack Start app...");
    run_command_inherit("bun", &["run", "build"], Some(&web_dir))?;

    info("Step 3/3: Deploying to Cloudflare Workers...");
    run_command_inherit("bunx", &["wrangler", "deploy"], Some(&web_dir))?;

    info("Deploy complete.");
    Ok(())
}
