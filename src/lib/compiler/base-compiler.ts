import { dirname, join, normalize, relative } from "path";
import { getValueOrDefault } from "./helpers/get-value-or-default";
import { PluginsLoader } from "./plugins/plugins-loader";
import { Configuration } from "../configuration/configuration";

export abstract class BaseCompiler<T = Record<string, any>> {
	constructor(private readonly pluginsLoader: PluginsLoader) {}

	public abstract run(
		configuration: Required<Configuration>,
		tsConfigPath: string,
		appName: string | undefined,
		extras?: T,
		onSuccess?: () => void,
	): any;

	public loadPlugins(
		configuration: Required<Configuration>,
		tsConfigPath: string,
		appName: string | undefined,
	) {
		const pluginsConfig = getValueOrDefault(
			configuration,
			"compilerOptions.plugins",
			appName,
		);
		const pathToSource = this.getPathToSource(
			configuration,
			tsConfigPath,
			appName,
		);

		return this.pluginsLoader.load(pluginsConfig, {
			pathToSource,
		});
	}

	public getPathToSource(
		configuration: Required<Configuration>,
		tsConfigPath: string,
		appName: string | undefined,
	) {
		const sourceRoot = getValueOrDefault<string>(
			configuration,
			"sourceRoot",
			appName,
			"sourceRoot",
		);
		const cwd = process.cwd();
		const relativeRootPath = dirname(relative(cwd, tsConfigPath));
		const pathToSource =
			normalize(sourceRoot).indexOf(normalize(relativeRootPath)) >= 0
				? join(cwd, sourceRoot)
				: join(cwd, relativeRootPath, sourceRoot);

		return pathToSource;
	}
}
