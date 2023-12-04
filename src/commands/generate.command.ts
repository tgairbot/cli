import chalk from "chalk";
import Table from "cli-table3";
import { Command, CommanderStatic } from "commander";
import { Schematic } from "../lib/schematics/tgairbot.collection";
import { loadConfiguration } from "../lib/utils/load-configuration";
import { AbstractCommand } from "./abstract.command";
import { Input } from "./command.input";
import { AbstractCollection } from "../lib/schematics/abstract.collection";
import { CollectionFactory } from "../lib/schematics/collection.factory";
import { Collection } from "../lib/schematics/collection";

export class GenerateCommand extends AbstractCommand {
	public async load(program: CommanderStatic): Promise<void> {
		program
			.command("generate <schematic> [name] [path]")
			.alias("g")
			.description(await this.buildDescription())
			.option(
				"-p, --project [project]",
				"Project in which to generate files.",
			)
			.option(
				"--flat",
				"Enforce flat structure of generated element.",
				() => true,
			)
			.option(
				"--no-flat",
				"Enforce that directories are generated.",
				() => false,
			)
			.option("--skip-import", "Skip importing", () => true, false)
			.action(
				async (
					schematic: string,
					name: string,
					path: string,
					command: Command,
				) => {
					const options: Input[] = [];

					if (command.flat !== undefined) {
						options.push({ name: "flat", value: command.flat });
					}

					options.push({
						name: "collection",
						value: Collection.TGAIRBOT,
					});
					options.push({
						name: "project",
						value: command.project,
					});

					options.push({
						name: "skipImport",
						value: command.skipImport,
					});

					const inputs: Input[] = [];
					inputs.push({ name: "schematic", value: schematic });
					inputs.push({ name: "name", value: name });
					inputs.push({ name: "path", value: path });

					await this.action.handle(inputs, options);
				},
			);
	}

	private async buildDescription(): Promise<string> {
		const collection = await this.getCollection();
		return (
			"Generate a TgAirBot element.\n" +
			`  Schematics available on ${chalk.bold(
				collection,
			)} collection:\n` +
			this.buildSchematicsListAsTable(
				await this.getSchematics(collection),
			)
		);
	}

	private buildSchematicsListAsTable(schematics: Schematic[]): string {
		const leftMargin = "    ";
		const tableConfig = {
			head: ["name", "alias", "description"],
			chars: {
				"left": leftMargin.concat("│"),
				"top-left": leftMargin.concat("┌"),
				"bottom-left": leftMargin.concat("└"),
				"mid": "",
				"left-mid": "",
				"mid-mid": "",
				"right-mid": "",
			},
		};
		const table: any = new Table(tableConfig);
		for (const schematic of schematics) {
			table.push([
				chalk.green(schematic.name),
				chalk.cyan(schematic.alias),
				schematic.description,
			]);
		}
		return table.toString();
	}

	private async getCollection(): Promise<string> {
		const configuration = await loadConfiguration();

		return configuration.collection;
	}

	private async getSchematics(collection: string): Promise<Schematic[]> {
		const abstractCollection: AbstractCollection =
			CollectionFactory.create(collection);
		return abstractCollection.getSchematics();
	}
}
