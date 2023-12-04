import { SchematicRunner } from "../runners/schematic.runner";
import { AbstractCollection } from "./abstract.collection";
import { Collection } from "./collection";
import { TgAirBotCollection } from "./tgairbot.collection";
import { Runner } from "../runners/runner";
import { RunnerFactory } from "../runners/runner.factory";

export class CollectionFactory {
	public static create(collection: Collection | string): AbstractCollection {
		const schematicRunner = RunnerFactory.create(
			Runner.SCHEMATIC,
		) as SchematicRunner;

		return new TgAirBotCollection(schematicRunner);
	}
}
