import { Command } from "commander";
import chalk from "chalk";
import type { InstallOptions } from "../types";
import { gatherInstallConfig } from "./utils/prompts";
import { getGlobalDependencies, installGlobalDependencies } from "./utils/installers";

export const installCommand = new Command("install")
  .description("Install global dependencies (commitizen)")
  .option("-f, --force", "Force reinstallation even if already installed")
  .option(
    "-p, --package-manager <manager>",
    "Package manager to use (npm, yarn, or pnpm)"
  )
  .action(async (options: InstallOptions) => {
    await runInstall(options);
  });

async function runInstall(options: InstallOptions): Promise<void> {
  const { force = false } = options;

  // Display welcome message
  console.log(chalk.cyan("\n📦 Installing global dependencies...\n"));
  
  if (force) {
    console.log(
      chalk.yellow(
        "⚠️  Force mode enabled: dependencies will be reinstalled!\n"
      )
    );
  }

  // Gather configuration from options and prompts
  const config = await gatherInstallConfig(options);

  // Get global dependencies
  const globalDeps = getGlobalDependencies();

  // Install global dependencies
  await installGlobalDependencies(
    config.packageManager,
    globalDeps,
    config.force
  );

  // Display success message
  console.log(
    chalk.greenBright(
      "\n🎉 Global dependencies installed successfully!\n"
    )
  );
}

