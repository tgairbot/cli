import { Input } from "../../../commands/command.input";
import { Configuration } from "../../configuration/configuration";

export function getValueOrDefault<T = any>(
	configuration: Required<Configuration>,
	propertyPath: string,
	appName: string | undefined,
	key?:
		| "path"
		| "webpack"
		| "webpackPath"
		| "entryFile"
		| "sourceRoot"
		| "exec"
		| "builder"
		| "typeCheck",
	options: Input[] = [],
	defaultValue?: T,
): T {
	const item = options.find(option => option.name === key);
	const origValue = item && (item.value as unknown as T);

	if (origValue !== undefined && origValue !== null) return origValue as T;

	if (configuration.projects && configuration.projects[appName as string]) {
		appName = appName && !appName.includes('"') ? `"${appName}"` : appName;

		const perAppValue = getValueOfPath(
			configuration,
			`projects.${appName}.`.concat(propertyPath),
		);
		if (perAppValue !== undefined) {
			return perAppValue as T;
		}
	}

	let value = getValueOfPath(configuration, propertyPath);

	if (value === undefined) {
		value = defaultValue;
	}

	return value;
}

export function getValueOfPath<T = any>(
	object: Record<string, any>,
	propertyPath: string,
): T {
	const fragments = propertyPath.split(".");

	let propertyValue = object;
	let isConcatInProgress = false;
	let path = "";

	for (const fragment of fragments) {
		if (!propertyValue) break;

		if (fragment.startsWith('"') && fragment.endsWith('"')) {
			path = stripDoubleQuotes(fragment);
		} else if (fragment.startsWith('"')) {
			path += stripDoubleQuotes(fragment) + ".";
			isConcatInProgress = true;
			continue;
		} else if (isConcatInProgress && !fragment.endsWith('"')) {
			path += fragment + ".";
			continue;
		} else if (fragment.endsWith('"')) {
			path += stripDoubleQuotes(fragment);
			isConcatInProgress = false;
		} else {
			path = fragment;
		}

		propertyValue = propertyValue[path];
		path = "";
	}

	return propertyValue as T;
}

function stripDoubleQuotes(text: string) {
	return text.replace(/"/g, "");
}
