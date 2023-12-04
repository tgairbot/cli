import * as chokidar from "chokidar";
import { statSync } from "fs";
import { sync } from "glob";
import { dirname, join, sep } from "path";
import * as shell from "shelljs";

import { copyPathResolve } from "./helpers/copy-path-resolve";
import { getValueOrDefault } from "./helpers/get-value-or-default";
import {
	ActionOnFile,
	Asset,
	AssetEntry,
	Configuration,
} from "../configuration/configuration";

export class AssetsManager {
	private watchAssetsKeyValue: { [key: string]: boolean } = {};
	private watchers: chokidar.FSWatcher[] = [];
	private actionInProgress = false;

	public closeWatchers() {
		const timeoutMs = 500;
		const closeFn = () => {
			if (this.actionInProgress) {
				this.actionInProgress = false;
				setTimeout(closeFn, timeoutMs);
			} else {
				this.watchers.forEach(watcher => watcher.close());
			}
		};

		setTimeout(closeFn, timeoutMs);
	}

	public copyAssets(
		configuration: Required<Configuration>,
		appName: string,
		outDir: string,
		watchAssetsMode: boolean,
	) {
		const assets =
			getValueOrDefault<Asset[]>(
				configuration,
				"compilerOptions.assets",
				appName,
			) || [];

		if (assets.length <= 0) return;

		try {
			let sourceRoot = getValueOrDefault(
				configuration,
				"sourceRoot",
				appName,
			);
			sourceRoot = join(process.cwd(), sourceRoot);

			const filesToCopy = assets.map<AssetEntry>(item => {
				if (typeof item === "string") {
					return {
						glob: join(sourceRoot, item),
						outDir,
					};
				}

				return {
					outDir: item.outDir || outDir,
					glob: join(sourceRoot, item.include!),
					exclude: item.exclude
						? join(sourceRoot, item.exclude)
						: undefined,
					flat: item.flat, // deprecated field
					watchAssets: item.watchAssets,
				};
			});

			const isWatchEnabled =
				getValueOrDefault<boolean>(
					configuration,
					"compilerOptions.watchAssets",
					appName,
				) || watchAssetsMode;

			for (const item of filesToCopy) {
				const option: ActionOnFile = {
					action: "change",
					item,
					path: "",
					sourceRoot,
					watchAssetsMode: isWatchEnabled,
				};

				if (isWatchEnabled || item.watchAssets) {
					// prettier-ignore
					const watcher = chokidar
                        .watch(item.glob, { ignored: item.exclude })
                        .on('add', (path: string) => this.actionOnFile({ ...option, path, action: 'change' }))
                        .on('change', (path: string) => this.actionOnFile({ ...option, path, action: 'change' }))
                        .on('unlink', (path: string) => this.actionOnFile({ ...option, path, action: 'unlink' }));

					this.watchers.push(watcher);
				} else {
					const files = sync(item.glob, {
						ignore: item.exclude,
					}).filter(matched => statSync(matched).isFile());

					for (const path of files) {
						this.actionOnFile({
							...option,
							path,
							action: "change",
						});
					}
				}
			}
		} catch (err) {
			throw new Error(
				`An error occurred during the assets copying process. ${err.message}`,
			);
		}
	}

	private actionOnFile(option: ActionOnFile) {
		const { action, item, path, sourceRoot, watchAssetsMode } = option;
		const isWatchEnabled = watchAssetsMode || item.watchAssets;

		if (!isWatchEnabled && this.watchAssetsKeyValue[path]) return;

		this.watchAssetsKeyValue[path] = true;

		this.actionInProgress = true;

		const dest = copyPathResolve(
			path,
			item.outDir!,
			sourceRoot.split(sep).length,
		);

		if (action === "change") {
			shell.mkdir("-p", dirname(dest));
			shell.cp(path, dest);
		} else if (action === "unlink") {
			shell.rm(dest);
		}
	}
}
