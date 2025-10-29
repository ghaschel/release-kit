#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "../src/commands/init";
import packageJson from "../package.json";

const program = new Command();

program
  .name("release-kit")
  .description("A complete automated release + changelog setup kit")
  .version(packageJson.version);

program.addCommand(initCommand);

program.parse();
