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

const ESLINT_CONFIG_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.yaml",
  ".eslintrc.yml",
  ".eslintrc.json",
  ".eslintrc",
];

export async function findExistingEslintConfig(): Promise<string | null> {
  for (const configFile of ESLINT_CONFIG_FILES) {
    if (await pathExists(configFile)) {
      return configFile;
    }
  }
  return null;
}

export async function hasEslintConfig(): Promise<boolean> {
  const config = await findExistingEslintConfig();
  return config !== null;
}

export function getTemplateEslintConfigName(): string {
  return "eslint.config.mjs";
}

export async function shouldSkipEslintSetup(): Promise<boolean> {
  const existingConfig = await findExistingEslintConfig();
  const templateName = getTemplateEslintConfigName();
  
  // Skip ESLint setup if there's an existing config that doesn't match our template name
  return existingConfig !== null && existingConfig !== templateName;
}

export async function detectPrettierMethod(): Promise<"eslint" | "pretty-quick" | null> {
  const lintStagedPath = path.resolve(".lintstagedrc.json");
  
  // First, try to detect from existing .lintstagedrc.json
  if (await pathExists(".lintstagedrc.json")) {
    try {
      const content = await fs.readFile(lintStagedPath, "utf-8");
      const config = JSON.parse(content);
      
      // Check if pretty-quick is in the config
      for (const commands of Object.values(config)) {
        if (Array.isArray(commands)) {
          for (const cmd of commands) {
            if (typeof cmd === "string" && cmd.includes("pretty-quick")) {
              return "pretty-quick";
            }
          }
        }
      }
      
      // Default to eslint method if lint-staged exists but no pretty-quick found
      return "eslint";
    } catch {
      // Fall through to check package.json
    }
  }
  
  // If no .lintstagedrc.json, check if lint-staged is installed
  try {
    const pkgJson = await readPackageJson();
    const hasLintStaged = 
      pkgJson.devDependencies?.["lint-staged"] !== undefined ||
      pkgJson.dependencies?.["lint-staged"] !== undefined;
    
    if (!hasLintStaged) {
      return null;
    }
    
    // Check if pretty-quick is installed
    const hasPrettyQuick = 
      pkgJson.devDependencies?.["pretty-quick"] !== undefined ||
      pkgJson.dependencies?.["pretty-quick"] !== undefined;
    
    return hasPrettyQuick ? "pretty-quick" : "eslint";
  } catch {
    return null;
  }
}

