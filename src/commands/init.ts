import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import { execa } from "execa";
import path from "path";

export const initCommand = new Command("init")
  .description("Initialize your project with release-kit defaults")
  .action(async () => {
    console.log(chalk.cyan("\n🚀 Running release-kit init...\n"));

    const { packageManager } = await inquirer.prompt([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager do you use?",
        choices: ["pnpm", "npm", "yarn"],
      },
    ]);

    const installCmd = packageManager === "yarn" ? "add" : "install";
    const devDeps = [
      "husky",
      "lint-staged",
      "@commitlint/config-conventional",
      "@commitlint/cli",
      "commit-and-tag-version",
      "remark",
      "remark-parse",
      "remark-stringify",
    ];
    const globalDeps = ["commitizen"];

    const spinner = ora("Installing dev dependencies...").start();
    try {
      await execa(packageManager, [installCmd, "-D", ...devDeps], {
        stdio: "inherit",
      });
      spinner.succeed("Dev dependencies installed!");
    } catch (err) {
      spinner.fail("Failed to install dev dependencies");
      console.error(err);
      process.exit(1);
    }

    // Install global dependencies
    const globalDepsSpinner = ora("Installing global dependencies...").start();
    try {
      await execa(packageManager, [installCmd, "-g", ...globalDeps], {
        stdio: "inherit",
      });
      globalDepsSpinner.succeed("Dev dependencies installed!");
    } catch (err) {
      globalDepsSpinner.fail("Failed to install dev dependencies");
      console.error(err);
      process.exit(1);
    }

    // Setup Husky
    const huskyDir = path.resolve(".husky");
    const huskyExists = await fs.pathExists(huskyDir);

    if (huskyExists) {
      console.log(chalk.yellow("⚠️  Husky already initialized, skipping..."));
    } else {
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
    const commitizenSpinner = ora("Initializing commitizen...").start();
    try {
      await execa(
        "commitizen",
        [
          "init",
          "cz-conventional-changelog",
          `--${packageManager}`,
          "--save-dev",
          "--save-exact",
        ],
        { stdio: "inherit" }
      );
      commitizenSpinner.succeed("Commitizen initialized!");
    } catch (err) {
      commitizenSpinner.fail("Failed to initialize commitizen");
      console.error(err);
    }

    // Copy templates
    // In production, __dirname will be dist/src/commands, templates is at dist/templates
    const templatesDir = path.join(__dirname, "../../templates");
    const copySpinner = ora("Copying template files...").start();
    try {
      await fs.copy(templatesDir, process.cwd(), { overwrite: false });
      copySpinner.succeed("Scripts, commitizen config and versionrc copied!");
    } catch (err) {
      copySpinner.fail(
        "Failed to copy scripts, commitizen config and versionrc"
      );
      console.error(err);
    }

    // Update package.json
    const pkgSpinner = ora("Updating package.json scripts...").start();
    try {
      const pkgPath = path.resolve("package.json");
      const pkgJson = await fs.readJson(pkgPath);

      pkgJson.scripts = {
        ...pkgJson.scripts,
        release: "commit-and-tag-version",
        push: "git push --follow-tags",
      };

      await fs.writeJson(pkgPath, pkgJson, { spaces: 2 });
      pkgSpinner.succeed("package.json updated!");
    } catch (err) {
      pkgSpinner.fail("Failed to update package.json");
      console.error(err);
    }

    console.log(
      chalk.greenBright(
        "\n🎉 All done! Your project is ready for automated releases!\n"
      )
    );
  });
