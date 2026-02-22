use std::process::Command;

fn aidd_binary() -> Command {
    Command::new(env!("CARGO_BIN_EXE_aidd"))
}

#[test]
fn test_help_output() {
    let output = aidd_binary().arg("--help").output().expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("AI-Driven Development CLI"));
    assert!(stdout.contains("wt"));
    assert!(stdout.contains("issue"));
    assert!(stdout.contains("pr"));
    assert!(stdout.contains("status"));
}

#[test]
fn test_wt_help() {
    let output = aidd_binary()
        .args(["wt", "--help"])
        .output()
        .expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("ensure"));
    assert!(stdout.contains("remove"));
}

#[test]
fn test_issue_help() {
    let output = aidd_binary()
        .args(["issue", "--help"])
        .output()
        .expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("plan"));
}

#[test]
fn test_pr_help() {
    let output = aidd_binary()
        .args(["pr", "--help"])
        .output()
        .expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("create"));
}

#[test]
fn test_deploy_help() {
    let output = aidd_binary()
        .args(["deploy", "--help"])
        .output()
        .expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Deploy"));
}

#[test]
fn test_help_includes_deploy() {
    let output = aidd_binary().arg("--help").output().expect("failed to run");
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("deploy"));
}

#[test]
fn test_status_runs() {
    let output = aidd_binary()
        .arg("status")
        .output()
        .expect("failed to run");
    assert!(output.status.success());
}

#[test]
fn test_verbose_flag() {
    let output = aidd_binary()
        .args(["--verbose", "status"])
        .output()
        .expect("failed to run");
    assert!(output.status.success());
}

#[test]
fn test_invalid_subcommand_fails() {
    let output = aidd_binary()
        .arg("nonexistent")
        .output()
        .expect("failed to run");
    assert!(!output.status.success());
}

#[test]
fn test_missing_arguments_fails() {
    let output = aidd_binary()
        .args(["wt", "ensure"])
        .output()
        .expect("failed to run");
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("required"));
}
