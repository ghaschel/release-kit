import { Command } from "commander";
import chalk from "chalk";
import type { InitOptions, InitConfig } from "../types";
import { gatherInitConfig } from "./utils/prompts";
import {
  getBaseDependencies,
  getRemarkDependencies,
  getGlobalDependencies,
  getEslintDependencies,
  getPrettierDependencies,
  getLintStagedDependencies,
  installDevDependencies,
  installGlobalDependencies,
} from "./utils/installers";
import { setupHusky, setupCommitizen } from "./utils/setup";
import { 
  copyTemplateFiles, 
  updatePackageJsonScripts,
  updateVersionrcWithIssueTracker
} from "./utils/templates";
import { readPackageJson, shouldSkipEslintSetup } from "./utils/checker";

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
  .option(
    "-l, --lint-staged",
    "Set up lint-staged for pre-commit hooks"
  )
  .option(
    "--no-lint-staged",
    "Don't set up lint-staged"
  )
  .option(
    "--prettier-method <method>",
    "How to format code with Prettier (eslint or pretty-quick)"
  )
  .option(
    "--issue-url-format <format>",
    "Custom issue tracker URL format (e.g., https://linear.app/team/issue/{{prefix}}{{id}})"
  )
  .option(
    "--issue-prefix <prefix>",
    "Custom issue prefix (e.g., PROJ-, TEAM-)"
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

  // Check if we should skip ESLint setup (user has existing config)
  const skipEslint = await shouldSkipEslintSetup();

  // Build dependency list based on configuration
  const baseDeps = getBaseDependencies();
  const remarkDeps = config.useSplitChangelog ? getRemarkDependencies() : [];
  
  let lintingDeps: string[] = [];
  if (config.useLintStaged && config.prettierMethod) {
    lintingDeps = [
      ...getLintStagedDependencies(),
      ...getPrettierDependencies(config.prettierMethod),
    ];
    
    // Only add ESLint dependencies if no existing config or force mode
    if (!skipEslint || config.force) {
      lintingDeps = [...lintingDeps, ...getEslintDependencies()];
    } else {
      console.log(
        chalk.yellow(
          "⚠️  Existing ESLint config detected. Skipping ESLint dependency installation."
        )
      );
    }
  }

  const devDeps = [...baseDeps, ...remarkDeps, ...lintingDeps];

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
  await setupHusky(config.useLintStaged, config.force);

  // Setup Commitizen
  await setupCommitizen(pkgJson, config.force);

  // Copy template files
  await copyTemplateFiles(
    config.useSplitChangelog,
    config.useLintStaged,
    config.prettierMethod,
    config.force
  );

  // Update .versionrc.js with issue tracker config if provided
  if (config.issuePrefix || config.issueUrlFormat) {
    await updateVersionrcWithIssueTracker(
      config.issuePrefix,
      config.issueUrlFormat,
      config.force
    );
  }

  // Update package.json scripts
  await updatePackageJsonScripts(config.force);

  // Display success message
  displaySuccessMessage(config);
}

function displaySuccessMessage(config: InitConfig): void {
  console.log(
    chalk.greenBright(
      "\n🎉 All done! Your project is ready for automated releases!\n"
    )
  );
  
  if (config.useLintStaged && config.prettierMethod) {
    console.log(chalk.cyan("✨ Lint-staged has been configured with:"));
    console.log(
      chalk.cyan(
        `   - Prettier formatting via ${config.prettierMethod === "eslint" ? "ESLint" : "pretty-quick"}`
      )
    );
    console.log(chalk.cyan("   - ESLint for code quality\n"));
  }
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
