import vnopts from "vnopts";
import fastGlob from "fast-glob";
import * as core from "./main/core.js";
import { getSupportInfo as getSupportInfoWithoutPlugins } from "./main/support.js";
import getFileInfoWithoutPlugins from "./common/get-file-info.js";
import {
  loadPlugins,
  clearCache as clearPluginCache,
} from "./common/load-plugins.js";
import {
  resolveConfig,
  resolveConfigFile,
  clearCache as clearConfigCache,
} from "./config/resolve-config.js";
import * as errors from "./common/errors.js";
import * as coreOptions from "./main/core-options.evaluate.js";
import { createIsIgnoredFunction } from "./utils/ignore.js";
import { formatOptionsHiddenDefaults } from "./main/normalize-format-options.js";
import normalizeOptions from "./main/normalize-options.js";
import arrayify from "./utils/arrayify.js";
import partition from "./utils/partition.js";
import isNonEmptyArray from "./utils/is-non-empty-array.js";
import loadBuiltinPlugins from "./common/load-builtin-plugins.js";

/**
 * @param {*} fn
 * @param {*} optsArgIdx
 * @returns {*}
 */
function withPlugins(
  fn,
  optsArgIdx = 1 // Usually `opts` is the 2nd argument
) {
  return async (...args) => {
    const opts = args[optsArgIdx] || {};
    const plugins = (
      await Promise.all([
        loadBuiltinPlugins(),
        loadPlugins(opts.plugins, opts.pluginSearchDirs),
      ])
    ).flat();

    args[optsArgIdx] = {
      ...opts,
      plugins,
    };
    return fn(...args);
  };
}

const formatWithCursor = withPlugins(core.formatWithCursor);

async function format(text, options) {
  const { formatted } = await formatWithCursor(text, {
    ...options,
    cursorOffset: -1,
  });
  return formatted;
}

async function check(text, options) {
  return (await format(text, options)) === text;
}

// eslint-disable-next-line require-await
async function clearCache() {
  clearConfigCache();
  clearPluginCache();
}

/** @type {typeof getFileInfoWithoutPlugins} */
const getFileInfo = withPlugins(getFileInfoWithoutPlugins);

/** @type {typeof getSupportInfoWithoutPlugins} */
const getSupportInfo = withPlugins(getSupportInfoWithoutPlugins, 0);

// Internal shared with cli
const sharedWithCli = {
  errors,
  coreOptions,
  createIsIgnoredFunction,
  formatOptionsHiddenDefaults,
  normalizeOptions,
  getSupportInfoWithoutPlugins,
  vnopts,
  fastGlob,
  utils: {
    arrayify,
    isNonEmptyArray,
    partition,
  },
};

const debugApis = {
  parse: withPlugins(core.parse),
  formatAST: withPlugins(core.formatAst),
  formatDoc: withPlugins(core.formatDoc),
  printToDoc: withPlugins(core.printToDoc),
  printDocToString: withPlugins(core.printDocToString),
};

export {
  formatWithCursor,
  format,
  check,
  resolveConfig,
  resolveConfigFile,
  clearCache as clearConfigCache,
  getFileInfo,
  getSupportInfo,
  sharedWithCli as __internal,
  debugApis as __debug,
};
export * as util from "./utils/public.js";
export * as doc from "./document/public.js";
export { default as version } from "./main/version.evaluate.cjs";
