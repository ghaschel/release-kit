import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import type { PackageJson } from "../../types";

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
  pkgJson: PackageJson,
  force: boolean
): Promise<void> {
  const commitizenConfigExists = pkgJson.config?.commitizen;

  if (!force && commitizenConfigExists) {
    console.log(
      chalk.yellow(
        "⚠️  Commitizen already configured, skipping. Use `--force` to overwrite it."
      )
    );
    return;
  }

  const commitizenSpinner = ora(
    "Configuring commitizen with cz-git..."
  ).start();

  try {
    // Update package.json with cz-git path
    const pkgPath = path.resolve("package.json");
    const updatedPkgJson = await fs.readJson(pkgPath);

    if (!updatedPkgJson.config) {
      updatedPkgJson.config = {};
    }

    updatedPkgJson.config.commitizen = {
      path: "node_modules/cz-git",
    };

    await fs.writeJson(pkgPath, updatedPkgJson, { spaces: 2 });

    commitizenSpinner.succeed("Commitizen configured with cz-git!");
  } catch (err) {
    commitizenSpinner.fail("Failed to configure commitizen");
    console.error(err);
  }
}
