import { getDefaultTsconfigPath } from "../../utils/get-default-tsconfig-path";
import { getValueOrDefault } from "./get-value-or-default";
import { Input } from "../../../commands/command.input";
import { Builder, Configuration } from "../../configuration/configuration";

export function getTscConfigPath(
	configuration: Required<Configuration>,
	cmdOptions: Input[],
	appName: string,
) {
	let tsconfigPath = getValueOrDefault<string | undefined>(
		configuration,
		"compilerOptions.tsConfigPath",
		appName,
		"path",
		cmdOptions,
	);

	if (tsconfigPath) return tsconfigPath;

	const builder = getValueOrDefault<Builder>(
		configuration,
		"compilerOptions.builder",
		appName,
	);

	tsconfigPath =
		typeof builder === "object" && builder?.type === "tsc"
			? builder.options?.configPath
			: undefined;

	return tsconfigPath ?? getDefaultTsconfigPath();
}
