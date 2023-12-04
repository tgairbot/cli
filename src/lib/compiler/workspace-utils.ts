import rimraf from "rimraf";
import { getValueOrDefault } from "./helpers/get-value-or-default";
import { Configuration } from "../configuration/configuration";

export class WorkspaceUtils {
	public async deleteOutDirIfEnabled(
		configuration: Required<Configuration>,
		appName: string,
		dirPath: string,
	) {
		const isDeleteEnabled = getValueOrDefault<boolean>(
			configuration,
			"compilerOptions.deleteOutDir",
			appName,
		);

		if (!isDeleteEnabled) return;

		await rimraf(dirPath);
	}
}
