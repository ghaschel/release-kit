import inquirer from "inquirer";
import type { PackageManager, InitOptions, InitConfig } from "../../types";
import { validatePackageManager } from "./validation";

interface PromptAnswers {
  packageManager?: PackageManager;
  useSplitChangelog?: boolean;
}

export async function gatherInitConfig(options: InitOptions): Promise<InitConfig> {
  const { force = false, packageManager: pmOption, splitChangelog: splitOption } = options;

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

  if (splitOption === undefined) {
    prompts.push({
      type: "confirm",
      name: "useSplitChangelog",
      message:
        "Do you want to use split changelog? (Creates individual changelog files per version)",
      default: true,
    });
  }

  // Prompt for missing options
  const answers: PromptAnswers = prompts.length > 0
    ? await inquirer.prompt(prompts)
    : {};

  return {
    packageManager: validatedPm || answers.packageManager!,
    useSplitChangelog: splitOption !== undefined ? splitOption : (answers.useSplitChangelog ?? true),
    force,
  };
}

