import chalk from "chalk";
import { Answers } from "inquirer";
import { Input } from "../commands/command.input";
import { getValueOrDefault } from "../lib/compiler/helpers/get-value-or-default";
import { loadConfiguration } from "../lib/utils/load-configuration";
import {
	askForProjectName,
	moveDefaultProjectToStart,
	shouldAskForProject,
	shouldGenerateFlat,
} from "../lib/utils/project-utils";
import { AbstractAction } from "./abstract.action";
import { Collection } from "../lib/schematics/collection";
import { AbstractCollection } from "../lib/schematics/abstract.collection";
import { CollectionFactory } from "../lib/schematics/collection.factory";
import { SchematicOption } from "../lib/schematics/schematic.option";
import { MESSAGES } from "../lib/ui/messages";

export class GenerateAction extends AbstractAction {
	public async handle(inputs: Input[], options: Input[]) {
		await generateFiles(inputs.concat(options));
	}
}

const generateFiles = async (inputs: Input[]) => {
	const configuration = await loadConfiguration();
	const collectionOption = inputs.find(
		option => option.name === "collection",
	)!.value as string;
	const schematic = inputs.find(option => option.name === "schematic")!
		.value as string;
	const appName = inputs.find(option => option.name === "project")!
		.value as string;
	const flat = inputs.find(option => option.name === "flat");

	const collection: AbstractCollection = CollectionFactory.create(
		collectionOption || configuration.collection || Collection.TGAIRBOT,
	);
	const schematicOptions: SchematicOption[] = mapSchematicOptions(inputs);
	schematicOptions.push(
		new SchematicOption("language", configuration.language),
	);
	const configurationProjects = configuration.projects;

	let sourceRoot = appName
		? getValueOrDefault(configuration, "sourceRoot", appName)
		: configuration.sourceRoot;

	const flatValue = !!flat?.value;

	let generateFlat = shouldGenerateFlat(configuration, appName, flatValue);

	if (shouldAskForProject(schematic, configurationProjects, appName)) {
		const defaultLabel = " [ Default ]";
		let defaultProjectName: string =
			configuration.sourceRoot + defaultLabel;

		for (const property in configurationProjects) {
			if (
				configurationProjects[property].sourceRoot ===
				configuration.sourceRoot
			) {
				defaultProjectName = property + defaultLabel;
				break;
			}
		}

		const projects = moveDefaultProjectToStart(
			configuration,
			defaultProjectName,
			defaultLabel,
		);

		const answers: Answers = await askForProjectName(
			MESSAGES.PROJECT_SELECTION_QUESTION,
			projects,
		);

		const project: string = answers.appName.replace(defaultLabel, "");
		if (project !== configuration.sourceRoot) {
			sourceRoot = configurationProjects[project].sourceRoot;
		}

		if (answers.appName !== defaultProjectName) {
			generateFlat = shouldGenerateFlat(
				configuration,
				answers.appNames,
				flatValue,
			);
		}
	}

	schematicOptions.push(new SchematicOption("sourceRoot", sourceRoot));
	schematicOptions.push(new SchematicOption("flat", generateFlat));

	try {
		const schematicInput = inputs.find(input => input.name === "schematic");
		if (!schematicInput) {
			throw new Error(
				"Unable to find a schematic for this configuration",
			);
		}
		await collection.execute(
			schematicInput.value as string,
			schematicOptions,
		);
	} catch (error) {
		if (error && error.message) {
			console.error(chalk.red(error.message));
		}
	}
};

const mapSchematicOptions = (inputs: Input[]): SchematicOption[] => {
	const excludedInputNames = ["schematic", "flat"];
	const options: SchematicOption[] = [];
	inputs.forEach(input => {
		if (
			!excludedInputNames.includes(input.name) &&
			input.value !== undefined
		) {
			options.push(new SchematicOption(input.name, input.value));
		}
	});
	return options;
};
