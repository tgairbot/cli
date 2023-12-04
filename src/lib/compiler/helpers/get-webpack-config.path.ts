import { getValueOrDefault } from "./get-value-or-default";
import { Builder, Configuration } from "../../configuration/configuration";
import { Input } from "../../../commands/command.input";

export function getWebpackConfigPath(
	configuration: Required<Configuration>,
	cmdOptions: Input[],
	appName: string,
) {
	let webpackPath = getValueOrDefault<string | undefined>(
		configuration,
		"compilerOptions.webpackConfigPath",
		appName,
		"webpackPath",
		cmdOptions,
	);
	if (webpackPath) return webpackPath;

	const builder = getValueOrDefault<Builder>(
		configuration,
		"compilerOptions.builder",
		appName,
	);

	webpackPath =
		typeof builder === "object" && builder?.type === "webpack"
			? builder.options?.configPath
			: undefined;

	return webpackPath;
}
