import chalk from "chalk";
import type { PackageManager } from "../../types";

const VALID_PACKAGE_MANAGERS: PackageManager[] = ["npm", "yarn", "pnpm"];

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

