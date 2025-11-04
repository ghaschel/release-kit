import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import type { PrettierMethod } from "../../types";
import { 
  areTemplateFilesInstalled, 
  findExistingEslintConfig, 
  getTemplateEslintConfigName,
  shouldSkipEslintSetup 
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

    // Copy split changelog scripts if enabled
    if (useSplitChangelog) {
      await fs.copy(
        path.join(templatesDir, "scripts"),
        path.join(process.cwd(), "scripts"),
        { overwrite: force }
      );
    } else {
      await removeSpitChangelogFiles();
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
  const shouldCopy = !existingConfig || (force && existingConfig === templateName);
  
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

async function removeSpitChangelogFiles(): Promise<void> {
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

