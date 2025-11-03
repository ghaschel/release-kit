import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import { execa } from "execa";
import path from "path";

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
  .action(async (options) => {
    const {
      force,
      packageManager: pmOption,
      splitChangelog: splitOption,
    } = options;

    // Validate package manager option if provided
    if (pmOption) {
      const validManagers = ["npm", "yarn", "pnpm"];
      if (!validManagers.includes(pmOption.toLowerCase())) {
        console.log(
          chalk.red(
            `❌ Invalid package manager "${pmOption}". Must be one of: npm, yarn, pnpm\n`
          )
        );
        process.exit(1);
      }
    }

    if (force) {
      console.log(
        chalk.cyan("\n🚀 Running release-kit init with --force...\n")
      );
      console.log(
        chalk.yellow(
          "⚠️  Force mode enabled: existing files will be overwritten!\n"
        )
      );
    } else {
      console.log(chalk.cyan("\n🚀 Running release-kit init...\n"));
    }

    // Prompt for options not provided via CLI
    const prompts: any[] = [];

    if (!pmOption) {
      prompts.push({
        type: "list",
        name: "packageManager",
        message: "Which package manager do you use?",
        choices: ["pnpm", "npm", "yarn"],
      });
    }

    // Only prompt for split changelog if not provided via CLI
    if (splitOption === undefined) {
      prompts.push({
        type: "confirm",
        name: "useSplitChangelog",
        message:
          "Do you want to use split changelog? (Creates individual changelog files per version)",
        default: true,
      });
    }

    const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {};
    const packageManager = pmOption?.toLowerCase() || answers.packageManager;
    const useSplitChangelog =
      splitOption !== undefined
        ? splitOption
        : answers.useSplitChangelog ?? true;

    const pkgPath = path.resolve("package.json");
    const pkgJson = await fs.readJson(pkgPath);

    const installCmd = packageManager === "yarn" ? "add" : "install";
    const baseDeps = [
      "husky",
      "lint-staged",
      "@commitlint/config-conventional",
      "@commitlint/cli",
      "commit-and-tag-version",
    ];

    // Only add remark dependencies if using split changelog
    const remarkDeps = useSplitChangelog
      ? ["remark", "remark-parse", "remark-stringify"]
      : [];

    const devDeps = [...baseDeps, ...remarkDeps];
    const globalDeps = ["commitizen"];

    // Check which dependencies need to be installed
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
    };

    const missingDevDeps = devDeps.filter((dep) => !allDeps[dep]);

    if (!force && missingDevDeps.length === 0) {
      console.log(
        chalk.yellow(
          "⚠️  All dev dependencies already installed, skipping. Use `--force` to reinstall them."
        )
      );
    } else {
      const depsToInstall = force ? devDeps : missingDevDeps;
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

    // Install global dependencies (commitizen)
    // Check if commitizen is already installed globally
    let commitizenInstalled = false;
    try {
      await execa("commitizen", ["--version"]);
      commitizenInstalled = true;
    } catch (err) {
      // commitizen not installed
      commitizenInstalled = false;
    }

    if (!force && commitizenInstalled) {
      console.log(
        chalk.yellow(
          "⚠️  Global dependencies already installed, skipping. Use `--force` to reinstall them."
        )
      );
    } else {
      const globalDepsSpinner = ora(
        "Installing global dependencies..."
      ).start();
      try {
        await execa(packageManager, [installCmd, "-g", ...globalDeps], {
          stdio: "inherit",
        });
        globalDepsSpinner.succeed("Global dependencies installed!");
      } catch (err) {
        globalDepsSpinner.fail("Failed to install global dependencies");
        console.error(err);
        // Don't exit, continue with the rest
      }
    }
    // Setup Husky
    const huskyDir = path.resolve(".husky");
    const huskyExists = await fs.pathExists(huskyDir);

    if (!force && huskyExists) {
      console.log(
        chalk.yellow(
          "⚠️  Husky already initialized, skipping. Use `--force` to overwrite it."
        )
      );
    } else {
      if (force && huskyExists) {
        await fs.remove(huskyDir);
      }
      const huskySpinner = ora("Setting up Husky...").start();
      try {
        await execa("npx", ["husky", "init"], { stdio: "inherit" });
        huskySpinner.succeed("Husky initialized!");
      } catch (err) {
        huskySpinner.fail("Failed to setup Husky");
        console.error(err);
      }
    }

    // Initialize commitizen
    const commitizenConfigExists = pkgJson.config?.commitizen;

    if (!force && commitizenConfigExists) {
      console.log(
        chalk.yellow(
          "⚠️  Commitizen already initialized, skipping. Use `--force` to overwrite it."
        )
      );
    } else {
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

    // Copy templates
    // In production, __dirname will be dist/src/commands, templates is at dist/templates
    const templatesDir = path.join(__dirname, "../../templates");
    const versionrcExists = await fs.pathExists(path.resolve(".versionrc.js"));
    const commitlintConfigExists = await fs.pathExists(
      path.resolve("commitlint.config.js")
    );
    const scriptsDir = await fs.pathExists(path.resolve("scripts"));

    if (!force && versionrcExists && commitlintConfigExists && scriptsDir) {
      console.log(
        chalk.yellow(
          "⚠️  Template files already exist, skipping copy. Use `release-it-please update` to update the template files."
        )
      );
    } else {
      const copySpinner = ora("Copying template files...").start();
      try {
        await fs.copy(templatesDir, process.cwd(), { overwrite: force });

        // If not using split changelog, remove the scripts directory and update .versionrc.js
        if (!useSplitChangelog) {
          // Remove scripts directory
          const scriptsPath = path.resolve("scripts");
          if (await fs.pathExists(scriptsPath)) {
            await fs.remove(scriptsPath);
          }

          // Update .versionrc.js to remove split-changelog hook
          const versionrcPath = path.resolve(".versionrc.js");
          if (await fs.pathExists(versionrcPath)) {
            const versionrcContent = `module.exports = {
  skip: { tag: false },
  infile: "CHANGELOG.md",
  header: "# Changelog\\n\\n",
};
`;
            await fs.writeFile(versionrcPath, versionrcContent);
          }
        }

        copySpinner.succeed("Scripts, commitlint config and versionrc copied!");
      } catch (err) {
        copySpinner.fail(
          "Failed to copy scripts, commitlint config and versionrc"
        );
        console.error(err);
      }
    }

    // Update package.json
    const requiredScripts = {
      release: "commit-and-tag-version",
      push: "git push --follow-tags",
    };

    const updatedPkgJson = await fs.readJson(pkgPath);
    const existingScripts = updatedPkgJson.scripts || {};

    const missingScripts = Object.keys(requiredScripts).filter(
      (script) => !existingScripts[script]
    );

    if (!force && missingScripts.length === 0) {
      console.log(
        chalk.yellow(
          "⚠️  All required scripts already exist, skipping. Use `--force` to overwrite them."
        )
      );
    } else {
      const pkgSpinner = ora("Updating package.json scripts...").start();
      try {
        updatedPkgJson.scripts = {
          ...existingScripts,
          ...requiredScripts,
        };

        await fs.writeJson(pkgPath, updatedPkgJson, { spaces: 2 });
        pkgSpinner.succeed("package.json updated!");
      } catch (err) {
        pkgSpinner.fail("Failed to update package.json");
        console.error(err);
      }
    }

    console.log(
      chalk.greenBright(
        "\n🎉 All done! Your project is ready for automated releases!\n"
      )
    );
  });
