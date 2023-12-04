import inquirer from "inquirer";
import { Answers, Question } from "inquirer";
import { Input } from "../../commands/command.input";
import { getValueOrDefault } from "../compiler/helpers/get-value-or-default";
import { generateSelect } from "../questions/questions";
import {
	Configuration,
	ProjectConfiguration,
} from "../configuration/configuration";

export function shouldAskForProject(
	schematic: string,
	configurationProjects: { [key: string]: ProjectConfiguration },
	appName: string,
) {
	return (
		["app", "sub-app", "library", "lib"].includes(schematic) === false &&
		configurationProjects &&
		Object.entries(configurationProjects).length !== 0 &&
		!appName
	);
}

export function shouldGenerateFlat(
	configuration: Required<Configuration>,
	appName: string,
	flatValue: boolean,
): boolean {
	// CLI parameters have the highest priority
	if (flatValue === true) {
		return flatValue;
	}

	const flatConfiguration = getValueOrDefault(
		configuration,
		"generateOptions.flat",
		appName || "",
	);
	if (typeof flatConfiguration === "boolean") {
		return flatConfiguration;
	}
	return flatValue;
}

export async function askForProjectName(
	promptQuestion: string,
	projects: string[],
): Promise<Answers> {
	const questions: Question[] = [
		generateSelect("appName")(promptQuestion)(projects),
	];
	const prompt = inquirer.createPromptModule();
	return prompt(questions);
}

export function moveDefaultProjectToStart(
	configuration: Configuration,
	defaultProjectName: string,
	defaultLabel: string,
) {
	let projects: string[] =
		configuration.projects != null
			? Object.keys(configuration.projects)
			: [];
	if (configuration.sourceRoot !== "src") {
		projects = projects.filter(
			p => p !== defaultProjectName.replace(defaultLabel, ""),
		);
	}
	projects.unshift(defaultProjectName);
	return projects;
}

export function hasValidOptionFlag(
	queriedOptionName: string,
	options: Input[],
	queriedValue: string | number | boolean = true,
): boolean {
	return options.some(
		(option: Input) =>
			option.name === queriedOptionName && option.value === queriedValue,
	);
}
