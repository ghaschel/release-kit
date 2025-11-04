import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";
import type { PackageManager } from "../../types";
import { getMissingDependencies, isGloballyInstalled } from "./checker";
import type { PackageJson } from "../../types";

export function getInstallCommand(pm: PackageManager): string {
  return pm === "yarn" ? "add" : "install";
}

export function getBaseDependencies(): string[] {
  return [
    "husky",
    "lint-staged",
    "@commitlint/config-conventional",
    "@commitlint/cli",
    "commit-and-tag-version",
  ];
}

export function getRemarkDependencies(): string[] {
  return ["remark", "remark-parse", "remark-stringify"];
}

export function getGlobalDependencies(): string[] {
  return ["commitizen"];
}

export async function installDevDependencies(
  packageManager: PackageManager,
  dependencies: string[],
  pkgJson: PackageJson,
  force: boolean
): Promise<void> {
  const installCmd = getInstallCommand(packageManager);
  const missingDeps = getMissingDependencies(dependencies, pkgJson);

  if (!force && missingDeps.length === 0) {
    console.log(
      chalk.yellow(
        "⚠️  All dev dependencies already installed, skipping. Use `--force` to reinstall them."
      )
    );
    return;
  }

  const depsToInstall = force ? dependencies : missingDeps;
  const spinner = ora("Installing dev dependencies...").start();
  
  try {
    await execa(packageManager, [installCmd, "-D", ...depsToInstall], {
      stdio: "inherit",
    });
    spinner.succeed("Dev dependencies installed!");
  } catch (err) {
    spinner.fail("Failed to install dev dependencies");
    console.error(err);
    process.exit(1);
  }
}

export async function installGlobalDependencies(
  packageManager: PackageManager,
  dependencies: string[],
  force: boolean
): Promise<void> {
  const installCmd = getInstallCommand(packageManager);
  
  // Check if all global dependencies are installed
  const installationChecks = await Promise.all(
    dependencies.map((dep) => isGloballyInstalled(dep))
  );
  const allInstalled = installationChecks.every((installed) => installed);

  if (!force && allInstalled) {
    console.log(
      chalk.yellow(
        "⚠️  Global dependencies already installed, skipping. Use `--force` to reinstall them."
      )
    );
    return;
  }

  const globalDepsSpinner = ora("Installing global dependencies...").start();
  
  try {
    await execa(packageManager, [installCmd, "-g", ...dependencies], {
      stdio: "inherit",
    });
    globalDepsSpinner.succeed("Global dependencies installed!");
  } catch (err) {
    globalDepsSpinner.fail("Failed to install global dependencies");
    console.error(err);
    // Don't exit, continue with the rest
  }
}

