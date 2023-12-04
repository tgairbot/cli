import { Builder, Configuration } from "../../configuration/configuration";

import { getValueOrDefault } from "./get-value-or-default";
import { Input } from "../../../commands/command.input";

export function getBuilder(
	configuration: Required<Configuration>,
	cmdOptions: Input[],
	appName: string,
) {
	const builderValue = getValueOrDefault<Builder>(
		configuration,
		"compilerOptions.builder",
		appName,
		"builder",
		cmdOptions,
		"tsc",
	);

	return typeof builderValue === "string"
		? {
				type: builderValue,
		  }
		: builderValue;
}
