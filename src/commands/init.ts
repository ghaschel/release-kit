import { Command } from "commander";
import chalk from "chalk";
import type { InitOptions } from "../types";
import { gatherInitConfig } from "./utils/prompts";
import {
  getBaseDependencies,
  getRemarkDependencies,
  getGlobalDependencies,
  installDevDependencies,
  installGlobalDependencies,
} from "./utils/installers";
import { setupHusky, setupCommitizen } from "./utils/setup";
import { copyTemplateFiles, updatePackageJsonScripts } from "./utils/templates";
import { readPackageJson } from "./utils/checker";

export const initCommand = new Command("init")
  .description("Initialize your project with release-kit defaults")
  .option("-f, --force", "Force reinitialization and overwrite existing files")
  .option(
    "-p, --package-manager <manager>",
    "Package manager to use (npm, yarn, or pnpm)"
  )
  .option(
    "-s, --split-changelog",
    "Use split changelog (creates individual changelog files per version)"
  )
  .option(
    "--no-split-changelog",
    "Don't use split changelog (use single CHANGELOG.md file)"
  )
  .action(async (options: InitOptions) => {
    await runInit(options);
  });

async function runInit(options: InitOptions): Promise<void> {
  const { force = false } = options;

  // Display welcome message
  displayWelcomeMessage(force);

  // Gather configuration from options and prompts
  const config = await gatherInitConfig(options);

  // Read package.json
  const pkgJson = await readPackageJson();

  // Build dependency list based on split changelog choice
  const baseDeps = getBaseDependencies();
  const remarkDeps = config.useSplitChangelog ? getRemarkDependencies() : [];
  const devDeps = [...baseDeps, ...remarkDeps];

  // Install dev dependencies
  await installDevDependencies(
    config.packageManager,
    devDeps,
    pkgJson,
    config.force
  );

  // Install global dependencies
  const globalDeps = getGlobalDependencies();
  await installGlobalDependencies(
    config.packageManager,
    globalDeps,
    config.force
  );

  // Setup Husky
  await setupHusky(config.force);

  // Setup Commitizen
  await setupCommitizen(config.packageManager, pkgJson, config.force);

  // Copy template files
  await copyTemplateFiles(config.useSplitChangelog, config.force);

  // Update package.json scripts
  await updatePackageJsonScripts(config.force);

  // Display success message
  console.log(
    chalk.greenBright(
      "\n🎉 All done! Your project is ready for automated releases!\n"
    )
  );
}

function displayWelcomeMessage(force: boolean): void {
  if (force) {
    console.log(chalk.cyan("\n🚀 Running release-kit init with --force...\n"));
    console.log(
      chalk.yellow(
        "⚠️  Force mode enabled: existing files will be overwritten!\n"
      )
    );
  } else {
    console.log(chalk.cyan("\n🚀 Running release-kit init...\n"));
  }
}
