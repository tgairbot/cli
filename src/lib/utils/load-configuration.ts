import { Configuration } from "../configuration/configuration";
import { ConfigurationLoader } from "../configuration/configuration.loader";
import { FileSystemReader } from "../readers/file-system.reader";
import { TgairbotConfigurationLoader } from "../configuration/tgairbot-configuration.loader";

export async function loadConfiguration(): Promise<Required<Configuration>> {
	const loader: ConfigurationLoader = new TgairbotConfigurationLoader(
		new FileSystemReader(process.cwd()),
	);
	return loader.load();
}
