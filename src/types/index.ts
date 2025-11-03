export type PackageManager = "npm" | "yarn" | "pnpm";

export interface InitOptions {
  force?: boolean;
  packageManager?: string;
  splitChangelog?: boolean;
}

export interface InitConfig {
  packageManager: PackageManager;
  useSplitChangelog: boolean;
  force: boolean;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  config?: {
    commitizen?: unknown;
  };
}
