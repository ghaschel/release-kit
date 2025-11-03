import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import type { PackageJson } from "../../types";

export async function isGloballyInstalled(packageName: string): Promise<boolean> {
  try {
    await execa(packageName, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function readPackageJson(): Promise<PackageJson> {
  const pkgPath = path.resolve("package.json");
  return await fs.readJson(pkgPath);
}

export async function writePackageJson(pkgJson: PackageJson): Promise<void> {
  const pkgPath = path.resolve("package.json");
  await fs.writeJson(pkgPath, pkgJson, { spaces: 2 });
}

export function getMissingDependencies(
  required: string[],
  existing: PackageJson
): string[] {
  const allDeps = {
    ...existing.dependencies,
    ...existing.devDependencies,
  };
  return required.filter((dep) => !allDeps[dep]);
}

export async function pathExists(filePath: string): Promise<boolean> {
  return await fs.pathExists(path.resolve(filePath));
}

export async function areTemplateFilesInstalled(): Promise<boolean> {
  const versionrcExists = await pathExists(".versionrc.js");
  const commitlintConfigExists = await pathExists("commitlint.config.js");
  const scriptsDir = await pathExists("scripts");
  
  return versionrcExists && commitlintConfigExists && scriptsDir;
}

