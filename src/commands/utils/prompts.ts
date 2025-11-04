import inquirer from "inquirer";
import type { PackageManager, PrettierMethod, InitOptions, InitConfig, InstallOptions, InstallConfig } from "../../types";
import { validatePackageManager, validatePrettierMethod } from "./validation";

interface InitPromptAnswers {
  packageManager?: PackageManager;
  useSplitChangelog?: boolean;
  useLintStaged?: boolean;
  prettierMethod?: PrettierMethod;
}

export async function gatherInitConfig(options: InitOptions): Promise<InitConfig> {
  const { 
    force = false, 
    packageManager: pmOption, 
    splitChangelog: splitOption,
    lintStaged: lintStagedOption,
    prettierMethod: prettierMethodOption,
  } = options;

  // Validate package manager if provided
  const validatedPm = validatePackageManager(pmOption);
  const validatedPrettierMethod = validatePrettierMethod(prettierMethodOption);

  // Build prompts for missing options
  const prompts: any[] = [];

  if (!validatedPm) {
    prompts.push({
      type: "list",
      name: "packageManager",
      message: "Which package manager do you use?",
      choices: ["pnpm", "npm", "yarn"],
    });
  }

  if (splitOption === undefined) {
    prompts.push({
      type: "confirm",
      name: "useSplitChangelog",
      message:
        "Do you want to use split changelog? (Creates individual changelog files per version)",
      default: true,
    });
  }

  if (lintStagedOption === undefined) {
    prompts.push({
      type: "confirm",
      name: "useLintStaged",
      message:
        "Do you want to set up lint-staged for pre-commit hooks?",
      default: true,
    });
  }

  // Prompt for missing options
  const answers: InitPromptAnswers = prompts.length > 0
    ? await inquirer.prompt(prompts)
    : {};

  const useLintStaged = lintStagedOption !== undefined ? lintStagedOption : (answers.useLintStaged ?? true);

  // Ask about prettier method only if lint-staged is enabled
  let prettierMethod: PrettierMethod | null = null;
  if (useLintStaged) {
    if (validatedPrettierMethod) {
      prettierMethod = validatedPrettierMethod;
    } else if (prettierMethodOption === undefined) {
      const prettierAnswer = await inquirer.prompt([{
        type: "list",
        name: "prettierMethod",
        message: "How do you want to format code with Prettier?",
        choices: [
          {
            name: "Via ESLint (recommended for consistency)",
            value: "eslint",
          },
          {
            name: "Via pretty-quick (faster)",
            value: "pretty-quick",
          },
        ],
        default: "eslint",
      }]);
      prettierMethod = prettierAnswer.prettierMethod;
    }
  }

  return {
    packageManager: validatedPm || answers.packageManager!,
    useSplitChangelog: splitOption !== undefined ? splitOption : (answers.useSplitChangelog ?? true),
    useLintStaged,
    prettierMethod,
    force,
  };
}

export async function gatherInstallConfig(options: InstallOptions): Promise<InstallConfig> {
  const { force = false, packageManager: pmOption } = options;

  // Validate package manager if provided
  const validatedPm = validatePackageManager(pmOption);

  // Build prompts for missing options
  const prompts: any[] = [];

  if (!validatedPm) {
    prompts.push({
      type: "list",
      name: "packageManager",
      message: "Which package manager do you use?",
      choices: ["pnpm", "npm", "yarn"],
    });
  }

  // Prompt for missing options
  const answers: { packageManager?: PackageManager } = prompts.length > 0
    ? await inquirer.prompt(prompts)
    : {};

  return {
    packageManager: validatedPm || answers.packageManager!,
    force,
  };
}

