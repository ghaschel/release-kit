import inquirer, { type DistinctQuestion } from "inquirer";
import type {
  PackageManager,
  PrettierMethod,
  InitOptions,
  InitConfig,
  InstallOptions,
  InstallConfig,
} from "../../types";
import { validatePackageManager, validatePrettierMethod } from "./validation";

interface InitPromptAnswers {
  packageManager?: PackageManager;
  useSplitChangelog?: boolean;
  useLintStaged?: boolean;
  prettierMethod?: PrettierMethod;
  useIssueTracker?: boolean;
  issueUrlFormat?: string;
  issuePrefix?: string;
}

export async function gatherInitConfig(
  options: InitOptions
): Promise<InitConfig> {
  const {
    force = false,
    packageManager: pmOption,
    splitChangelog: splitOption,
    lintStaged: lintStagedOption,
    prettierMethod: prettierMethodOption,
    issueUrlFormat: issueUrlOption,
    issuePrefix: issuePrefixOption,
  } = options;

  // Validate package manager if provided
  const validatedPm = validatePackageManager(pmOption);
  const validatedPrettierMethod = validatePrettierMethod(prettierMethodOption);

  // Build prompts for missing options
  const prompts: DistinctQuestion<InitPromptAnswers>[] = [];

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
      message: "Do you want to set up lint-staged for pre-commit hooks?",
      default: true,
    });
  }

  // Prompt for missing options
  const answers: InitPromptAnswers =
    prompts.length > 0 ? await inquirer.prompt(prompts) : {};

  const useLintStaged =
    lintStagedOption !== undefined
      ? lintStagedOption
      : (answers.useLintStaged ?? true);

  // Ask about prettier method only if lint-staged is enabled
  let prettierMethod: PrettierMethod | null = null;
  if (useLintStaged) {
    if (validatedPrettierMethod) {
      prettierMethod = validatedPrettierMethod;
    } else if (prettierMethodOption === undefined) {
      const prettierAnswer = await inquirer.prompt([
        {
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
        },
      ]);
      prettierMethod = prettierAnswer.prettierMethod;
    }
  }

  // Ask about issue tracker configuration
  let issueUrlFormat: string | null = null;
  let issuePrefix: string | null = null;

  if (issueUrlOption !== undefined || issuePrefixOption !== undefined) {
    // CLI options provided
    issueUrlFormat = issueUrlOption || null;
    issuePrefix = issuePrefixOption || null;
  } else {
    // Ask interactively
    const issueTrackerAnswer = await inquirer.prompt([
      {
        type: "confirm",
        name: "useIssueTracker",
        message:
          "Do you want to configure a custom issue tracker (e.g., Linear, Jira)?",
        default: false,
      },
    ]);

    if (issueTrackerAnswer.useIssueTracker) {
      const issueDetailsAnswers = await inquirer.prompt([
        {
          type: "input",
          name: "issuePrefix",
          message: "What is your issue prefix? (e.g., PROJ-, TEAM-)",
          default: "ISSUE-",
          validate: (input: string) => {
            if (!input || input.trim().length === 0) {
              return "Issue prefix cannot be empty";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "issueUrlFormat",
          message:
            "What is your issue URL format? Use {{prefix}} and {{id}} as placeholders",
          default: "https://linear.app/your-team/issue/{{prefix}}{{id}}",
          validate: (input: string) => {
            if (!input || input.trim().length === 0) {
              return "Issue URL format cannot be empty";
            }
            if (!input.includes("{{id}}")) {
              return "URL format must include {{id}} placeholder";
            }
            return true;
          },
        },
      ]);

      issueUrlFormat = issueDetailsAnswers.issueUrlFormat;
      issuePrefix = issueDetailsAnswers.issuePrefix;
    }
  }

  return {
    packageManager: validatedPm || answers.packageManager!,
    useSplitChangelog:
      splitOption !== undefined
        ? splitOption
        : (answers.useSplitChangelog ?? true),
    useLintStaged,
    prettierMethod,
    issueUrlFormat,
    issuePrefix,
    force,
  };
}

export async function gatherInstallConfig(
  options: InstallOptions
): Promise<InstallConfig> {
  const { force = false, packageManager: pmOption } = options;

  // Validate package manager if provided
  const validatedPm = validatePackageManager(pmOption);

  // Build prompts for missing options
  const prompts: DistinctQuestion<{ packageManager?: PackageManager }>[] = [];

  if (!validatedPm) {
    prompts.push({
      type: "list",
      name: "packageManager",
      message: "Which package manager do you use?",
      choices: ["pnpm", "npm", "yarn"],
    });
  }

  // Prompt for missing options
  const answers: { packageManager?: PackageManager } =
    prompts.length > 0 ? await inquirer.prompt(prompts) : {};

  return {
    packageManager: validatedPm || answers.packageManager!,
    force,
  };
}
