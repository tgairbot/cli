import { AbstractCollection } from "./abstract.collection";
import { SchematicOption } from "./schematic.option";
import { AbstractRunner } from "../runners/abstract.runner";

export interface Schematic {
	name: string;
	alias: string;
	description: string;
}

export class TgAirBotCollection extends AbstractCollection {
	private static schematics: Schematic[] = [
		{
			name: "application",
			alias: "application",
			description: "Generate a new application workspace",
		},
		{
			name: "angular-app",
			alias: "ng-app",
			description: "",
		},
		{
			name: "middleware",
			alias: "mi",
			description: "Generate a middleware declaration",
		},
		{
			name: "layout",
			alias: "l",
			description: "Generate a layout declaration",
		},
		{
			name: "storage",
			alias: "s",
			description: "Generate a custom storage declaration",
		},
	];

	constructor(runner: AbstractRunner) {
		super("@tgairbot/schematics", runner);
	}

	public async execute(name: string, options: SchematicOption[]) {
		const schematic: string = this.validate(name);
		await super.execute(schematic, options);
	}

	public getSchematics(): Schematic[] {
		return TgAirBotCollection.schematics.filter(
			item => item.name !== "angular-app",
		);
	}

	private validate(name: string) {
		const schematic = TgAirBotCollection.schematics.find(
			s => s.name === name || s.alias === name,
		);

		if (schematic === undefined || schematic === null) {
			throw new Error(
				`Invalid schematic "${name}". Please, ensure that "${name}" exists in this collection.`,
			);
		}
		return schematic.name;
	}
}
