import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import type { PackageManager, PackageJson } from "../../types";

export async function setupHusky(
  useLintStaged: boolean,
  force: boolean
): Promise<void> {
  const huskyDir = path.resolve(".husky");
  const huskyExists = await fs.pathExists(huskyDir);

  if (!force && huskyExists) {
    console.log(
      chalk.yellow(
        "⚠️  Husky already initialized, skipping. Use `--force` to overwrite it."
      )
    );
    return;
  }

  if (force && huskyExists) {
    await fs.remove(huskyDir);
  }

  const huskySpinner = ora("Setting up Husky...").start();
  
  try {
    await execa("npx", ["husky", "init"], { stdio: "inherit" });
    
    // Update pre-commit hook
    const preCommitPath = path.join(huskyDir, "pre-commit");
    let preCommitContent = "# Pre-commit hook\n";
    
    if (useLintStaged) {
      preCommitContent += "npx lint-staged\n";
    }
    
    await fs.writeFile(preCommitPath, preCommitContent);
    await fs.chmod(preCommitPath, 0o755); // Make executable
    
    huskySpinner.succeed("Husky initialized!");
  } catch (err) {
    huskySpinner.fail("Failed to setup Husky");
    console.error(err);
  }
}

export async function setupCommitizen(
  packageManager: PackageManager,
  pkgJson: PackageJson,
  force: boolean
): Promise<void> {
  const commitizenConfigExists = pkgJson.config?.commitizen;

  if (!force && commitizenConfigExists) {
    console.log(
      chalk.yellow(
        "⚠️  Commitizen already initialized, skipping. Use `--force` to overwrite it."
      )
    );
    return;
  }

  const commitizenSpinner = ora("Initializing commitizen...").start();
  
  try {
    const commitizenArgs = [
      "init",
      "cz-conventional-changelog",
      `--${packageManager}`,
      "--save-dev",
      "--save-exact",
    ];
    
    if (force) {
      commitizenArgs.push("--force");
    }
    
    await execa("commitizen", commitizenArgs, { stdio: "inherit" });
    commitizenSpinner.succeed("Commitizen initialized!");
  } catch (err) {
    commitizenSpinner.fail("Failed to initialize commitizen");
    console.error(err);
  }
}

