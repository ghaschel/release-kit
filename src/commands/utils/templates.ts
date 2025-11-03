import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { areTemplateFilesInstalled } from "./checker";

export async function copyTemplateFiles(
  useSplitChangelog: boolean,
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
    await fs.copy(templatesDir, process.cwd(), { overwrite: force });

    // If not using split changelog, remove scripts and update .versionrc.js
    if (!useSplitChangelog) {
      await removeSpitChangelogFiles();
    }

    copySpinner.succeed("Scripts, commitlint config and versionrc copied!");
  } catch (err) {
    copySpinner.fail(
      "Failed to copy scripts, commitlint config and versionrc"
    );
    console.error(err);
  }
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

