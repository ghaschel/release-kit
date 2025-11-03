import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

export const updateCommand = new Command("update")
  .description("Update template files (scripts, configs) to the latest version")
  .action(async () => {
    console.log(chalk.cyan("\n🔄 Running release-kit update...\n"));
    console.log(
      chalk.yellow("⚠️  Update mode: template files will be overwritten!\n")
    );

    // Copy templates
    // In production, __dirname will be dist/src/commands, templates is at dist/templates
    const templatesDir = path.join(__dirname, "../../templates");
    const copySpinner = ora("Updating template files...").start();
    try {
      await fs.copy(templatesDir, process.cwd(), { overwrite: true });
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
