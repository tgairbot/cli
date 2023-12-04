import chalk from "chalk";
import { spawn } from "child_process";
import fs from "fs";
import { join } from "path";
import killProcess from "tree-kill";
import {
	defaultConfiguration,
	defaultOutDir,
} from "../lib/configuration/defaults";
import { treeKillSync as killProcessSync } from "../lib/utils/tree-kill";
import { BuildAction } from "./build.action";
import { Input } from "../commands/command.input";
import { ERROR_PREFIX } from "../lib/ui/prefixes";
import { getValueOrDefault } from "../lib/compiler/helpers/get-value-or-default";
import { getTscConfigPath } from "../lib/compiler/helpers/get-tsc-config.path";

export class StartAction extends BuildAction {
	public async handle(commandInputs: Input[], commandOptions: Input[]) {
		try {
			const configFileName = commandOptions.find(
				option => option.name === "config",
			)!.value as string;
			const configuration = await this.loader.load(configFileName);
			const appName = commandInputs.find(input => input.name === "app")!
				.value as string;

			const pathToTsconfig = getTscConfigPath(
				configuration,
				commandOptions,
				appName,
			);

			const watchModeOption = commandOptions.find(
				option => option.name === "watch",
			);
			const isWatchEnabled = !!(watchModeOption && watchModeOption.value);
			const watchAssetsModeOption = commandOptions.find(
				option => option.name === "watchAssets",
			);
			const isWatchAssetsEnabled = !!(
				watchAssetsModeOption && watchAssetsModeOption.value
			);
			const binaryToRun = getValueOrDefault(
				configuration,
				"exec",
				appName,
				"exec",
				commandOptions,
				defaultConfiguration.exec,
			);

			const { options: tsOptions } =
				this.tsConfigProvider.getByConfigFilename(pathToTsconfig);
			const outDir = tsOptions.outDir || defaultOutDir;
			const entryFile = getValueOrDefault(
				configuration,
				"entryFile",
				appName,
				"entryFile",
				commandOptions,
			);
			const sourceRoot = getValueOrDefault(
				configuration,
				"sourceRoot",
				appName,
				"sourceRoot",
				commandOptions,
				defaultConfiguration.sourceRoot,
			);
			const onSuccess = this.createOnSuccessHook(
				entryFile,
				sourceRoot,
				outDir,
				binaryToRun,
			);

			await this.runBuild(
				commandInputs,
				commandOptions,
				isWatchEnabled,
				isWatchAssetsEnabled,
				onSuccess,
			);
		} catch (err) {
			if (err instanceof Error) {
				console.log(`\n${ERROR_PREFIX} ${err.message}\n`);
			} else {
				console.error(`\n${chalk.red(err)}\n`);
			}
		}
	}

	public createOnSuccessHook(
		entryFile: string,
		sourceRoot: string,
		outDirName: string,
		binaryToRun: string,
	) {
		let childProcessRef: any;
		process.on(
			"exit",
			() => childProcessRef && killProcessSync(childProcessRef.pid),
		);

		return () => {
			if (childProcessRef) {
				childProcessRef.removeAllListeners("exit");
				childProcessRef.on("exit", () => {
					childProcessRef = this.spawnChildProcess(
						entryFile,
						sourceRoot,
						outDirName,
						binaryToRun,
					);
					childProcessRef.on(
						"exit",
						() => (childProcessRef = undefined),
					);
				});

				childProcessRef.stdin && childProcessRef.stdin.pause();
				killProcess(childProcessRef.pid);
			} else {
				childProcessRef = this.spawnChildProcess(
					entryFile,
					sourceRoot,
					outDirName,
					binaryToRun,
				);
				childProcessRef.on("exit", (code: number) => {
					process.exitCode = code;
					childProcessRef = undefined;
				});
			}
		};
	}

	private spawnChildProcess(
		entryFile: string,
		sourceRoot: string,
		outDirName: string,
		binaryToRun: string,
	) {
		let outputFilePath = join(outDirName, sourceRoot, entryFile);
		if (!fs.existsSync(outputFilePath + ".js")) {
			outputFilePath = join(outDirName, entryFile);
		}

		let childProcessArgs: string[] = [];
		const argsStartIndex = process.argv.indexOf("--");
		if (argsStartIndex >= 0) {
			// Prevents the need for users to double escape strings
			// i.e. I can run the more natural
			//   nest start -- '{"foo": "bar"}'
			// instead of
			//   nest start -- '\'{"foo": "bar"}\''
			childProcessArgs = process.argv
				.slice(argsStartIndex + 1)
				.map(arg => JSON.stringify(arg));
		}
		outputFilePath =
			outputFilePath.indexOf(" ") >= 0
				? `"${outputFilePath}"`
				: outputFilePath;

		const processArgs = [outputFilePath, ...childProcessArgs];

		const sourceMapsRegisterPath = this.getSourceMapSupportPkg();
		if (sourceMapsRegisterPath !== undefined) {
			processArgs.unshift(`-r "${sourceMapsRegisterPath}"`);
		}
		return spawn(binaryToRun, processArgs, {
			stdio: "inherit",
			shell: true,
		});
	}

	private getSourceMapSupportPkg() {
		try {
			return require.resolve("source-map-support/register");
		} catch {
			return undefined;
		}
	}
}
