import chalk from "chalk";
import { join } from "path";
import { WorkspaceUtils } from "../lib/compiler/workspace-utils";
import {
	defaultOutDir,
	defaultWebpackConfigFilename,
} from "../lib/configuration/defaults";
import { AbstractAction } from "./abstract.action";
import webpack = require("webpack");
import { ERROR_PREFIX } from "../lib/ui/prefixes";
import { Input } from "../commands/command.input";
import { Configuration } from "../lib/configuration/configuration";
import { FileSystemReader } from "../lib/readers/file-system.reader";
import { AssetsManager } from "../lib/compiler/assets-manager";
import { getTscConfigPath } from "../lib/compiler/helpers/get-tsc-config.path";
import { TsConfigProvider } from "../lib/compiler/helpers/tsconfig-provider";
import { PluginsLoader } from "../lib/compiler/plugins/plugins-loader";
import { getValueOrDefault } from "../lib/compiler/helpers/get-value-or-default";
import { TypeScriptBinaryLoader } from "../lib/compiler/typescript-loader";
import { getBuilder } from "../lib/compiler/helpers/get-builder";
import { getWebpackConfigPath } from "../lib/compiler/helpers/get-webpack-config.path";
import { ConfigurationLoader } from "../lib/configuration/configuration.loader";
import { TgairbotConfigurationLoader } from "../lib/configuration/tgairbot-configuration.loader";

export class BuildAction extends AbstractAction {
	protected readonly pluginsLoader = new PluginsLoader();
	protected readonly tsLoader = new TypeScriptBinaryLoader();
	protected readonly tsConfigProvider = new TsConfigProvider(this.tsLoader);
	protected readonly fileSystemReader = new FileSystemReader(process.cwd());
	protected readonly loader: ConfigurationLoader =
		new TgairbotConfigurationLoader(this.fileSystemReader);
	protected readonly assetsManager = new AssetsManager();
	protected readonly workspaceUtils = new WorkspaceUtils();

	public async handle(commandInputs: Input[], commandOptions: Input[]) {
		try {
			const watchModeOption = commandOptions.find(
				option => option.name === "watch",
			);
			const watchMode = !!(watchModeOption && watchModeOption.value);

			const watchAssetsModeOption = commandOptions.find(
				option => option.name === "watchAssets",
			);
			const watchAssetsMode = !!(
				watchAssetsModeOption && watchAssetsModeOption.value
			);

			await this.runBuild(
				commandInputs,
				commandOptions,
				watchMode,
				watchAssetsMode,
			);
		} catch (err) {
			if (err instanceof Error) {
				console.log(`\n${ERROR_PREFIX} ${err.message}\n`);
			} else {
				console.error(`\n${chalk.red(err)}\n`);
			}
			process.exit(1);
		}
	}

	public async runBuild(
		commandInputs: Input[],
		commandOptions: Input[],
		watchMode: boolean,
		watchAssetsMode: boolean,
		onSuccess?: () => void,
	) {
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
		const { options: tsOptions } =
			this.tsConfigProvider.getByConfigFilename(pathToTsconfig);
		const outDir = tsOptions.outDir || defaultOutDir;

		const isWebpackEnabled = getValueOrDefault<boolean>(
			configuration,
			"compilerOptions.webpack",
			appName,
			"webpack",
			commandOptions,
		);
		const builder = isWebpackEnabled
			? { type: "webpack" }
			: getBuilder(configuration, commandOptions, appName);

		await this.workspaceUtils.deleteOutDirIfEnabled(
			configuration,
			appName,
			outDir,
		);
		this.assetsManager.copyAssets(
			configuration,
			appName,
			outDir,
			watchAssetsMode,
		);

		switch (builder.type) {
			case "tsc":
				return this.runTsc(
					watchMode,
					commandOptions,
					configuration,
					pathToTsconfig,
					appName,
					onSuccess,
				);
			case "webpack":
				return this.runWebpack(
					configuration,
					appName,
					commandOptions,
					pathToTsconfig,
					watchMode,
					onSuccess,
				);
		}
	}

	private async runWebpack(
		configuration: Required<Configuration>,
		appName: string,
		commandOptions: Input[],
		pathToTsconfig: string,
		watchMode: boolean,
		onSuccess: (() => void) | undefined,
	) {
		const { WebpackCompiler } = await import(
			"../lib/compiler/webpack-compiler"
		);
		const webpackCompiler = new WebpackCompiler(this.pluginsLoader);

		const webpackPath =
			getWebpackConfigPath(configuration, commandOptions, appName) ??
			defaultWebpackConfigFilename;

		const webpackConfigFactoryOrConfig = this.getWebpackConfigFactoryByPath(
			webpackPath,
			defaultWebpackConfigFilename,
		);
		return webpackCompiler.run(
			configuration,
			pathToTsconfig,
			appName,
			{
				inputs: commandOptions,
				webpackConfigFactoryOrConfig,
				watchMode,
				assetsManager: this.assetsManager,
			},
			onSuccess,
		);
	}

	private async runTsc(
		watchMode: boolean,
		options: Input[],
		configuration: Required<Configuration>,
		pathToTsconfig: string,
		appName: string,
		onSuccess: (() => void) | undefined,
	) {
		if (watchMode) {
			const { WatchCompiler } = await import(
				"../lib/compiler/watch-compiler"
			);
			const watchCompiler = new WatchCompiler(
				this.pluginsLoader,
				this.tsConfigProvider,
				this.tsLoader,
			);
			const isPreserveWatchOutputEnabled = options.find(
				option =>
					option.name === "preserveWatchOutput" &&
					option.value === true,
			)?.value as boolean | undefined;
			watchCompiler.run(
				configuration,
				pathToTsconfig,
				appName,
				{ preserveWatchOutput: isPreserveWatchOutputEnabled },
				onSuccess,
			);
		} else {
			const { Compiler } = await import("../lib/compiler/compiler");
			const compiler = new Compiler(
				this.pluginsLoader,
				this.tsConfigProvider,
				this.tsLoader,
			);
			compiler.run(
				configuration,
				pathToTsconfig,
				appName,
				undefined,
				onSuccess,
			);
			this.assetsManager.closeWatchers();
		}
	}

	private getWebpackConfigFactoryByPath(
		webpackPath: string,
		defaultPath: string,
	): (
		config: webpack.Configuration,
		webpackRef: typeof webpack,
	) => webpack.Configuration {
		const pathToWebpackFile = join(process.cwd(), webpackPath);
		try {
			return require(pathToWebpackFile);
		} catch (err) {
			if (webpackPath !== defaultPath) {
				throw err;
			}
			return ({}) => ({});
		}
	}
}
