import camelCase from "camelcase";
import { pick } from "../utils.js";
import getContextOptions from "./get-context-options.js";
import minimist from "./minimist.js";
import createMinimistOptions from "./create-minimist-options.js";
import normalizeCliOptions from "./normalize-cli-options.js";

function parseArgv(rawArguments, detailedOptions, logger, keys) {
  const minimistOptions = createMinimistOptions(detailedOptions);
  let argv = minimist(rawArguments, minimistOptions);

  if (keys) {
    if (keys.includes("plugin-search-dir") && !keys.includes("plugin-search")) {
      keys.push("plugin-search");
    }

    detailedOptions = detailedOptions.filter((option) =>
      keys.includes(option.name)
    );
    argv = pick(argv, keys);
  }

  const normalized = normalizeCliOptions(argv, detailedOptions, { logger });

  return {
    ...Object.fromEntries(
      Object.entries(normalized).map(([key, value]) => {
        const option = detailedOptions.find(({ name }) => name === key) || {};
        // If the flag is a prettier option, use the option name
        // `--plugin-search-dir` -> `pluginSearchDirs`
        // Otherwise use camel case for readability
        // `--ignore-unknown` -> `ignoreUnknown`
        return [option.forwardToApi || camelCase(key), value];
      })
    ),
    get __raw() {
      return argv;
    },
  };
}

let detailedOptionsWithoutPlugins;
async function parseArgvWithoutPlugins(rawArguments, logger, keys) {
  if (!detailedOptionsWithoutPlugins) {
    ({ detailedOptions: detailedOptionsWithoutPlugins } =
      await getContextOptions([], false));
  }

  return parseArgv(
    rawArguments,
    detailedOptionsWithoutPlugins,
    logger,
    typeof keys === "string" ? [keys] : keys
  );
}

export { parseArgv, parseArgvWithoutPlugins };
