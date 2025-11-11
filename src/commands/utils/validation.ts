import chalk from "chalk";

import type { PackageManager, PrettierMethod } from "../../types";

const VALID_PACKAGE_MANAGERS: PackageManager[] = ["npm", "yarn", "pnpm"];
const VALID_PRETTIER_METHODS: PrettierMethod[] = ["eslint", "pretty-quick"];

export function validatePackageManager(
  pm: string | undefined
): PackageManager | null {
  if (!pm) return null;

  const normalized = pm.toLowerCase();
  if (!VALID_PACKAGE_MANAGERS.includes(normalized as PackageManager)) {
    console.log(
      chalk.red(
        `❌ Invalid package manager "${pm}". Must be one of: ${VALID_PACKAGE_MANAGERS.join(", ")}\n`
      )
    );
    process.exit(1);
  }

  return normalized as PackageManager;
}

export function isValidPackageManager(pm: string): pm is PackageManager {
  return VALID_PACKAGE_MANAGERS.includes(pm as PackageManager);
}

export function validatePrettierMethod(
  method: string | undefined
): PrettierMethod | null {
  if (!method) return null;

  const normalized = method.toLowerCase();
  if (!VALID_PRETTIER_METHODS.includes(normalized as PrettierMethod)) {
    console.log(
      chalk.red(
        `❌ Invalid prettier method "${method}". Must be one of: ${VALID_PRETTIER_METHODS.join(", ")}\n`
      )
    );
    process.exit(1);
  }

  return normalized as PrettierMethod;
}

export function isValidPrettierMethod(
  method: string
): method is PrettierMethod {
  return VALID_PRETTIER_METHODS.includes(method as PrettierMethod);
}
