import { CommanderStatic } from "commander";
import { ERROR_PREFIX } from "../lib/ui/prefixes";
import chalk from "chalk";
import { NewCommand } from "./new.command";
import { NewAction } from "../actions/new.action";
import { BuildAction } from "../actions/build.action";
import { StartAction } from "../actions/start.action";
import { StartCommand } from "./start.command";
import { BuildCommand } from "./build.command";
import { GenerateCommand } from "./generate.command";
import { GenerateAction } from "../actions/generate.action";

export class CommandLoader {
	public static async load(program: CommanderStatic): Promise<void> {
		new NewCommand(new NewAction()).load(program);
		new BuildCommand(new BuildAction()).load(program);
		new StartCommand(new StartAction()).load(program);
		await new GenerateCommand(new GenerateAction()).load(program);

		this.handleInvalidCommand(program);
	}

	private static handleInvalidCommand(program: CommanderStatic) {
		program.on("command:*", () => {
			console.error(
				`\n${ERROR_PREFIX} Invalid command: ${chalk.red("%s")}`,
				program.args.join(" "),
			);
			console.log(
				`See ${chalk.red(
					"--help",
				)} for a list of available commands.\n`,
			);
			process.exit(1);
		});
	}
}
