import chalk from "chalk";
import fs from "fs-extra";
import ora from "ora";
import path from "path";

import type { PrettierMethod } from "../../types";
import {
  areTemplateFilesInstalled,
  findExistingEslintConfig,
  getTemplateEslintConfigName,
} from "./checker";

export async function copyTemplateFiles(
  useSplitChangelog: boolean,
  useLintStaged: boolean,
  prettierMethod: PrettierMethod | null,
  force: boolean
): Promise<void> {
  const templatesDir = path.join(__dirname, "../../../templates");
  const templatesExist = await areTemplateFilesInstalled();

  if (!force && templatesExist) {
    console.log(
      chalk.yellow(
        "⚠️  Template files already exist, skipping copy. Use `release-it-please update` to update the template files."
      )
    );
    return;
  }

  const copySpinner = ora("Copying template files...").start();

  try {
    // Copy base files (commitlint config, versionrc)
    await fs.copy(
      path.join(templatesDir, "commitlint.config.js"),
      path.join(process.cwd(), "commitlint.config.js"),
      { overwrite: force }
    );

    await fs.copy(
      path.join(templatesDir, ".versionrc.js"),
      path.join(process.cwd(), ".versionrc.js"),
      { overwrite: force }
    );

    // Always copy base scripts (lowercase-commit-subject, custom-tag-message)
    const scriptsDir = path.join(process.cwd(), "scripts");
    await fs.ensureDir(scriptsDir);

    // Copy lowercase-commit-subject.mjs (always needed for prepare-commit-msg hook)
    await fs.copy(
      path.join(templatesDir, "scripts", "lowercase-commit-subject.mjs"),
      path.join(scriptsDir, "lowercase-commit-subject.mjs"),
      { overwrite: force }
    );

    // Copy custom-tag-message.mjs (always needed for posttag hook)
    await fs.copy(
      path.join(templatesDir, "scripts", "custom-tag-message.mjs"),
      path.join(scriptsDir, "custom-tag-message.mjs"),
      { overwrite: force }
    );

    // Copy split-changelog.mjs only if split changelog is enabled
    if (useSplitChangelog) {
      await fs.copy(
        path.join(templatesDir, "scripts", "split-changelog.mjs"),
        path.join(scriptsDir, "split-changelog.mjs"),
        { overwrite: force }
      );
    } else {
      await removeSplitChangelogScript();
    }

    // Copy lint-staged config if enabled
    if (useLintStaged && prettierMethod) {
      await copyLintStagedConfig(prettierMethod, force);
      await copyPrettierConfig(force);
      await copyEslintConfig(force);
    }

    copySpinner.succeed("Template files copied!");
  } catch (err) {
    copySpinner.fail("Failed to copy template files");
    console.error(err);
  }
}

async function copyLintStagedConfig(
  prettierMethod: PrettierMethod,
  force: boolean
): Promise<void> {
  const templatesDir = path.join(__dirname, "../../../templates");
  const sourceFile = `.lintstagedrc.${prettierMethod}.json`;
  const targetFile = ".lintstagedrc.json";

  const sourcePath = path.join(templatesDir, sourceFile);
  const targetPath = path.join(process.cwd(), targetFile);

  await fs.copy(sourcePath, targetPath, { overwrite: force });
}

async function copyPrettierConfig(force: boolean): Promise<void> {
  const templatesDir = path.join(__dirname, "../../../templates");
  const sourcePath = path.join(templatesDir, ".prettierrc");
  const targetPath = path.join(process.cwd(), ".prettierrc");

  await fs.copy(sourcePath, targetPath, { overwrite: force });
}

async function copyEslintConfig(force: boolean): Promise<void> {
  const existingConfig = await findExistingEslintConfig();
  const templateName = getTemplateEslintConfigName();

  // Only copy if:
  // 1. No existing config, OR
  // 2. Force mode AND existing config matches our template name
  const shouldCopy =
    !existingConfig || (force && existingConfig === templateName);

  if (!shouldCopy) {
    if (existingConfig && existingConfig !== templateName) {
      console.log(
        chalk.yellow(
          `⚠️  Existing ESLint config found (${existingConfig}), skipping ESLint template copy.`
        )
      );
    }
    return;
  }

  const templatesDir = path.join(__dirname, "../../../templates");
  const sourcePath = path.join(templatesDir, templateName);
  const targetPath = path.join(process.cwd(), templateName);

  await fs.copy(sourcePath, targetPath, { overwrite: force });
}

async function removeSplitChangelogScript(): Promise<void> {
  // Remove only the split-changelog.mjs file
  const splitChangelogPath = path.resolve("scripts", "split-changelog.mjs");
  if (await fs.pathExists(splitChangelogPath)) {
    await fs.remove(splitChangelogPath);
  }

  // Update .versionrc.js to remove split-changelog hook from postcommit
  const versionrcPath = path.resolve(".versionrc.js");
  if (await fs.pathExists(versionrcPath)) {
    let content = await fs.readFile(versionrcPath, "utf-8");

    // Remove the postcommit hook that runs split-changelog
    content = content.replace(
      /\s*postcommit:\s*"node scripts\/split-changelog\.mjs",?\s*/g,
      ""
    );

    // Clean up empty scripts object
    content = content.replace(/scripts:\s*\{\s*\}/g, "");
    content = content.replace(/scripts:\s*\{\s*,/g, "scripts: {");

    await fs.writeFile(versionrcPath, content);
  }
}

export async function updatePackageJsonScripts(force: boolean): Promise<void> {
  const requiredScripts = {
    release: "commit-and-tag-version",
    push: "git push --follow-tags",
  };

  const pkgPath = path.resolve("package.json");
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
    return;
  }

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

export async function updateVersionrcWithIssueTracker(
  issuePrefix: string | null,
  issueUrlFormat: string | null,
  _force: boolean
): Promise<void> {
  const versionrcPath = path.resolve(".versionrc.js");

  if (!(await fs.pathExists(versionrcPath))) {
    console.log(
      chalk.yellow(
        "⚠️  .versionrc.js not found, skipping issue tracker configuration."
      )
    );
    return;
  }

  const spinner = ora(
    "Updating .versionrc.js with issue tracker config..."
  ).start();

  try {
    // Read existing versionrc content
    const content = await fs.readFile(versionrcPath, "utf-8");

    // Parse the module.exports object (simple approach)
    let updatedContent = content;

    // Add issue tracker configuration
    if (issuePrefix) {
      const prefixConfig = `  issuePrefixes: ["${issuePrefix}"],`;

      // Check if issuePrefixes already exists
      if (content.includes("issuePrefixes:")) {
        updatedContent = updatedContent.replace(
          /issuePrefixes:\s*\[.*?\],/,
          prefixConfig
        );
      } else {
        // Add before the closing brace
        updatedContent = updatedContent.replace(/};$/m, `${prefixConfig}\n};`);
      }
    }

    if (issueUrlFormat) {
      const urlConfig = `  issueUrlFormat: "${issueUrlFormat}",`;

      // Check if issueUrlFormat already exists
      if (content.includes("issueUrlFormat:")) {
        updatedContent = updatedContent.replace(
          /issueUrlFormat:\s*".*?",/,
          urlConfig
        );
      } else {
        // Add before the closing brace
        updatedContent = updatedContent.replace(/};$/m, `${urlConfig}\n};`);
      }
    }

    await fs.writeFile(versionrcPath, updatedContent);
    spinner.succeed("Issue tracker configuration updated in .versionrc.js!");
  } catch (err) {
    spinner.fail("Failed to update .versionrc.js with issue tracker config");
    console.error(err);
  }
}
