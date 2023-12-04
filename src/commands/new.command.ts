import { AbstractCommand } from "./abstract.command";
import { Command } from "commander";
import { Input } from "./command.input";
import { Collection } from "../lib/schematics/collection";

export class NewCommand extends AbstractCommand {
	public load(program: Command) {
		program
			.command("new [name]")
			.alias("n")
			.description("Generate Tgairbot application.")
			.option(
				"--directory [directory]",
				"Specify the destination directory",
			)
			.option(
				"-g, --skip-git",
				"Skip git repository initialization.",
				false,
			)
			.option("-s, --skip-install", "Skip package installation.", false)
			.option(
				"-p, --package-manager [packageManager]",
				"Specify package manager.",
			)
			.option(
				"-t, --token [token]",
				"Apply you bot token",
				"YOU_BOT_TOKEN",
			)
			.option("--strict", "Enables strict mode in TypeScript.", false)
			.action(async (name: string, command: Command) => {
				const options: Input[] = [];

				options.push({ name: "directory", value: command.directory });
				options.push({ name: "skip-git", value: command.skipGit });
				options.push({
					name: "skip-install",
					value: command.skipInstall,
				});
				options.push({ name: "strict", value: command.strict });
				options.push({
					name: "packageManager",
					value: command.packageManager,
				});
				options.push({
					name: "collection",
					value: Collection.TGAIRBOT,
				});
				options.push({
					name: "token",
					value: command.token,
				});

				const inputs: Input[] = [];
				inputs.push({ name: "name", value: name });

				await this.action.handle(inputs, options);
			});
	}
}
