#!/usr/bin/env node
import commander from "commander";
import { CommandLoader } from "./commands/command.loader";

const bootstrap = async () => {
	commander
		.version(
			require("../package.json").version,
			"-v, --version",
			"Output the current version.",
		)
		.usage("<command> [options]")
		.helpOption("-h, --help", "Output usage information.");

	await CommandLoader.load(commander);

	await commander.parseAsync(process.argv);
};

bootstrap();
