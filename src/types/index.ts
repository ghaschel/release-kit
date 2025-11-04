export type PackageManager = "npm" | "yarn" | "pnpm";
export type PrettierMethod = "eslint" | "pretty-quick";

export interface InitOptions {
  force?: boolean;
  packageManager?: string;
  splitChangelog?: boolean;
  lintStaged?: boolean;
  prettierMethod?: string;
  issueUrlFormat?: string;
  issuePrefix?: string;
}

export interface InitConfig {
  packageManager: PackageManager;
  useSplitChangelog: boolean;
  useLintStaged: boolean;
  prettierMethod: PrettierMethod | null;
  issueUrlFormat: string | null;
  issuePrefix: string | null;
  force: boolean;
}

export interface InstallOptions {
  force?: boolean;
  packageManager?: string;
}

export interface InstallConfig {
  packageManager: PackageManager;
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
