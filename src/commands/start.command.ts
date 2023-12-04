import { Command, CommanderStatic } from "commander";
import { getRemainingFlags } from "../lib/utils/remaining-flags";
import { AbstractCommand } from "./abstract.command";
import { Input } from "./command.input";
import { ERROR_PREFIX, INFO_PREFIX } from "../lib/ui/prefixes";

export class StartCommand extends AbstractCommand {
	public load(program: CommanderStatic): void {
		program
			.command("start [app]")
			.allowUnknownOption()
			.option("-p, --path [path]", "Path to tsconfig file.")
			.option("-w, --watch", "Run in watch mode (live-reload).")
			.option(
				"-b, --builder [name]",
				"Builder to be used (tsc, webpack).",
			)
			.option("--watchAssets", "Watch non-ts files mode.")
			.option(
				"--webpack",
				"Use webpack for compilation (deprecated option, use --builder instead).",
			)
			.option("--webpackPath [path]", "Path to webpack configuration.")
			.option("--tsc", "Use typescript compiler for compilation.")
			.option(
				"--sourceRoot [sourceRoot]",
				"Points at the root of the source code for the single project in standard mode structures, or the default project in monorepo mode structures.",
			)
			.option("-e, --exec [binary]", 'Binary to run (default: "node").')
			.option(
				"--preserveWatchOutput",
				'Use "preserveWatchOutput" option when using tsc watch mode.',
			)
			.description("Run TgAirBot application.")
			.action(async (app: string, command: Command) => {
				const options: Input[] = [];

				options.push({
					name: "config",
					value: command.config,
				});

				const isWebpackEnabled = command.tsc ? false : command.webpack;
				options.push({ name: "webpack", value: isWebpackEnabled });
				options.push({ name: "watch", value: !!command.watch });
				options.push({
					name: "watchAssets",
					value: !!command.watchAssets,
				});
				options.push({
					name: "path",
					value: command.path,
				});
				options.push({
					name: "webpackPath",
					value: command.webpackPath,
				});
				options.push({
					name: "exec",
					value: command.exec,
				});
				options.push({
					name: "sourceRoot",
					value: command.sourceRoot,
				});
				options.push({
					name: "preserveWatchOutput",
					value:
						!!command.preserveWatchOutput &&
						!!command.watch &&
						!isWebpackEnabled,
				});

				const availableBuilders = ["tsc", "webpack"];
				if (
					command.builder &&
					!availableBuilders.includes(command.builder)
				) {
					console.error(
						ERROR_PREFIX +
							` Invalid builder option: ${
								command.builder
							}. Available builders: ${availableBuilders.join(
								", ",
							)}`,
					);
					return;
				}
				options.push({
					name: "builder",
					value: command.builder,
				});

				const inputs: Input[] = [];
				inputs.push({ name: "app", value: app });
				const flags = getRemainingFlags(program);

				try {
					await this.action.handle(inputs, options, flags);
				} catch (err) {
					process.exit(1);
				}
			});
	}
}
