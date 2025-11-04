import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import ora from "ora";
import path from "path";

import {
  detectPrettierMethod,
  findExistingEslintConfig,
  getTemplateEslintConfigName,
} from "./utils/checker";

export const updateCommand = new Command("update")
  .description("Update template files (scripts, configs) to the latest version")
  .action(async () => {
    console.log(chalk.cyan("\n🔄 Running release-kit update...\n"));
    console.log(
      chalk.yellow("⚠️  Update mode: template files will be overwritten!\n")
    );

    const templatesDir = path.join(__dirname, "../../templates");
    const copySpinner = ora("Updating template files...").start();

    try {
      // Detect current prettier method
      const prettierMethod = await detectPrettierMethod();

      // Copy base template files (commitlint, versionrc)
      await fs.copy(
        path.join(templatesDir, "commitlint.config.js"),
        path.join(process.cwd(), "commitlint.config.js"),
        { overwrite: true }
      );

      await fs.copy(
        path.join(templatesDir, ".versionrc.js"),
        path.join(process.cwd(), ".versionrc.js"),
        { overwrite: true }
      );

      // Copy scripts directory if it exists
      const scriptsDir = path.join(templatesDir, "scripts");
      if (await fs.pathExists(scriptsDir)) {
        await fs.copy(scriptsDir, path.join(process.cwd(), "scripts"), {
          overwrite: true,
        });
      }

      // Copy lint-staged config only if user has one
      if (prettierMethod) {
        const sourceFile = `.lintstagedrc.${prettierMethod}.json`;
        const sourcePath = path.join(templatesDir, sourceFile);
        const targetPath = path.join(process.cwd(), ".lintstagedrc.json");

        await fs.copy(sourcePath, targetPath, { overwrite: true });
        copySpinner.info(
          `Lint-staged config updated (using ${prettierMethod} method)`
        );
      }

      // Copy prettier config if it exists locally
      if (await fs.pathExists(path.join(process.cwd(), ".prettierrc"))) {
        await fs.copy(
          path.join(templatesDir, ".prettierrc"),
          path.join(process.cwd(), ".prettierrc"),
          { overwrite: true }
        );
      }

      // Copy ESLint config only if user has our template config
      const existingEslintConfig = await findExistingEslintConfig();
      const templateEslintName = getTemplateEslintConfigName();

      if (existingEslintConfig === templateEslintName) {
        await fs.copy(
          path.join(templatesDir, templateEslintName),
          path.join(process.cwd(), templateEslintName),
          { overwrite: true }
        );
      } else if (existingEslintConfig) {
        copySpinner.info(
          `Skipping ESLint config update (using ${existingEslintConfig})`
        );
      }

      // Update Husky hooks if .husky directory exists
      const huskyDir = path.join(process.cwd(), ".husky");
      if (await fs.pathExists(huskyDir)) {
        copySpinner.info("Updating Husky hooks...");

        // Update commit-msg hook
        const commitMsgPath = path.join(huskyDir, "commit-msg");
        const commitMsgContent = "npx --no -- commitlint --edit $1\n";
        await fs.writeFile(commitMsgPath, commitMsgContent);
        await fs.chmod(commitMsgPath, 0o755);

        copySpinner.info("Husky hooks updated!");
      }

      copySpinner.succeed("Template files updated!");
    } catch (err) {
      copySpinner.fail("Failed to update template files");
      console.error(err);
      process.exit(1);
    }

    console.log(
      chalk.greenBright("\n🎉 Template files updated successfully!\n")
    );
  });
