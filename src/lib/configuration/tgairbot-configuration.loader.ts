import { Configuration } from "./configuration";
import { ConfigurationLoader } from "./configuration.loader";
import { defaultConfiguration } from "./defaults";
import { Reader } from "../readers/reader";

const loadedConfigsCache = new Map<string, Required<Configuration>>();

export class TgairbotConfigurationLoader implements ConfigurationLoader {
	constructor(private readonly reader: Reader) {}

	public async load(name?: string): Promise<Required<Configuration>> {
		const cacheEntryKey = `${this.reader.constructor.name}:${name}`;
		const cachedConfig = loadedConfigsCache.get(cacheEntryKey);
		if (cachedConfig) return cachedConfig;

		let loadedConfig: Required<Configuration> | undefined;

		const content: string | undefined = name
			? await this.reader.read(name)
			: await this.reader.readAnyOf([]);

		if (content) {
			const fileConfig = JSON.parse(content);
			if (fileConfig.compilerOptions) {
				loadedConfig = {
					...defaultConfiguration,
					...fileConfig,
					compilerOptions: {
						...defaultConfiguration.compilerOptions,
						...fileConfig.compilerOptions,
					},
				};
			} else {
				loadedConfig = {
					...defaultConfiguration,
					...fileConfig,
				};
			}
		} else {
			loadedConfig = defaultConfiguration;
		}

		loadedConfigsCache.set(cacheEntryKey, loadedConfig!);

		return loadedConfig!;
	}
}
