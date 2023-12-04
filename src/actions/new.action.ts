import chalk from "chalk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as inquirer from "inquirer";
import { Answers, Question } from "inquirer";
import { join } from "path";
import { GitRunner } from "../lib/runners/git.runner";
import { normalizeToKebabOrSnakeCase } from "../lib/utils/formatting";
import { AbstractAction } from "./abstract.action";
import { Input } from "../commands/command.input";
import { MESSAGES } from "../lib/ui/messages";
import { EMOJIS } from "../lib/ui/emojis";
import { AbstractCollection } from "../lib/schematics/abstract.collection";
import { SchematicOption } from "../lib/schematics/schematic.option";
import { AbstractPackageManager } from "../lib/package-managers/abstract.package-manager";
import { CollectionFactory } from "../lib/schematics/collection.factory";
import { Collection } from "../lib/schematics/collection";
import { PackageManagerFactory } from "../lib/package-managers/package-manager.factory";
import { PackageManager } from "../lib/package-managers/package-manager";
import { generateInput, generateSelect } from "../lib/questions/questions";
import { defaultGitIgnore } from "../lib/configuration/defaults";

export class NewAction extends AbstractAction {
	public async handle(inputs: Input[], options: Input[]) {
		const directoryOption = options.find(
			option => option.name === "directory",
		);

		await askForMissingInformation(inputs, options);
		await generateApplicationFiles(inputs, options).catch(exit);

		const shouldSkipInstall = options.some(
			option => option.name === "skip-install" && option.value === true,
		);
		const shouldSkipGit = options.some(
			option => option.name === "skip-git" && option.value === true,
		);
		const projectDirectory = getProjectDirectory(
			getApplicationNameInput(inputs)!,
			directoryOption,
		);

		if (!shouldSkipInstall) {
			await installPackages(options, projectDirectory);
		}

		if (!shouldSkipGit) {
			await initializeGitRepository(projectDirectory);
			await createGitIgnoreFile(projectDirectory);
		}

		printCollective();

		process.exit(0);
	}
}

const getApplicationNameInput = (inputs: Input[]) =>
	inputs.find(input => input.name === "name");

const getPackageManagerInput = (inputs: Input[]) =>
	inputs.find(options => options.name === "packageManager");

const getProjectDirectory = (
	applicationName: Input,
	directoryOption?: Input,
): string => {
	return (
		(directoryOption && (directoryOption.value as string)) ||
		normalizeToKebabOrSnakeCase(applicationName.value as string)
	);
};

const askForMissingInformation = async (inputs: Input[], options: Input[]) => {
	console.info(MESSAGES.PROJECT_INFORMATION_START);
	console.info();

	const prompt: inquirer.PromptModule = inquirer.createPromptModule();

	const nameInput = getApplicationNameInput(inputs);
	if (!nameInput!.value) {
		const message = "What name would you like to use for the new project?";
		const questions = [generateInput("name", message)("tgairbot-app")];
		const answers: Answers = await prompt(
			questions as ReadonlyArray<Question>,
		);
		replaceInputMissingInformation(inputs, answers);
	}

	const packageManagerInput = getPackageManagerInput(options);
	if (!packageManagerInput!.value) {
		const answers = await askForPackageManager();
		replaceInputMissingInformation(options, answers);
	}
};

const replaceInputMissingInformation = (
	inputs: Input[],
	answers: Answers,
): Input[] => {
	return inputs.map(
		input =>
			(input.value =
				input.value !== undefined ? input.value : answers[input.name]),
	);
};

const generateApplicationFiles = async (args: Input[], options: Input[]) => {
	const collectionName = options.find(
		option => option.name === "collection" && option.value != null,
	)!.value;

	const collection: AbstractCollection = CollectionFactory.create(
		(collectionName as Collection) || Collection.TGAIRBOT,
	);

	const schematicOptions: SchematicOption[] = mapSchematicOptions(
		args.concat(options),
	);

	await collection.execute("application", schematicOptions);
	console.info();
};

const mapSchematicOptions = (options: Input[]): SchematicOption[] => {
	return options.reduce(
		(schematicOptions: SchematicOption[], option: Input) => {
			if (option.name !== "skip-install") {
				schematicOptions.push(
					new SchematicOption(option.name, option.value),
				);
			}
			return schematicOptions;
		},
		[],
	);
};

const installPackages = async (options: Input[], installDirectory: string) => {
	const inputPackageManager = getPackageManagerInput(options)!
		.value as string;

	let packageManager: AbstractPackageManager;

	try {
		packageManager = PackageManagerFactory.create(inputPackageManager);
		await packageManager.install(installDirectory, inputPackageManager);
	} catch (error) {
		if (error && error.message) {
			console.error(chalk.red(error.message));
		}
	}
};

const askForPackageManager = async (): Promise<Answers> => {
	const questions: Question[] = [
		generateSelect("packageManager")(MESSAGES.PACKAGE_MANAGER_QUESTION)([
			PackageManager.NPM,
			PackageManager.YARN,
			PackageManager.PNPM,
		]),
	];
	const prompt = inquirer.createPromptModule();
	return await prompt(questions);
};

const initializeGitRepository = async (dir: string) => {
	const runner = new GitRunner();
	await runner.run("init", true, join(process.cwd(), dir)).catch(() => {
		console.error(chalk.red(MESSAGES.GIT_INITIALIZATION_ERROR));
	});
};

const createGitIgnoreFile = (dir: string, content?: string) => {
	const fileContent = content || defaultGitIgnore;
	const filePath = join(process.cwd(), dir, ".gitignore");

	if (fileExists(filePath)) return;

	return fs.promises.writeFile(filePath, fileContent);
};

const printCollective = () => {
	const dim = print("dim");
	const yellow = print("yellow");
	const emptyLine = print();

	emptyLine();
	yellow(`Thanks for installing Tgairbot ${EMOJIS.PRAY}`);
	dim("to help us maintain this package.");
	emptyLine();
	emptyLine();

	emptyLine();
};

const print =
	(color: string | null = null) =>
	(str = "") => {
		const terminalCols = retrieveCols();
		const strLength = str.replace(/\u001b\[[0-9]{2}m/g, "").length;
		const leftPaddingLength = Math.floor((terminalCols - strLength) / 2);
		const leftPadding = " ".repeat(Math.max(leftPaddingLength, 0));
		if (color) {
			str = (chalk as any)[color](str);
		}
		console.log(leftPadding, str);
	};

export const retrieveCols = () => {
	const defaultCols = 80;
	try {
		const terminalCols = execSync("tput cols", {
			stdio: ["pipe", "pipe", "ignore"],
		});
		return parseInt(terminalCols.toString(), 10) || defaultCols;
	} catch {
		return defaultCols;
	}
};

const fileExists = (path: string) => {
	try {
		fs.accessSync(path);
		return true;
	} catch (err: any) {
		if (err.code === "ENOENT") {
			return false;
		}

		throw err;
	}
};

export const exit = () => process.exit(1);
