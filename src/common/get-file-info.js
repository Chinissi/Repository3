import path from "node:path";
import { inferParser } from "../main/options.js";
import * as config from "../config/resolve-config.js";
import createIgnorer from "./create-ignorer.js";

/**
 * @typedef {{ ignorePath?: string, withNodeModules?: boolean, plugins: object, resolveConfig?: boolean }} FileInfoOptions
 * @typedef {{ ignored: boolean, inferredParser: string | null }} FileInfoResult
 */

/**
 * @param {string} filePath
 * @param {FileInfoOptions} opts
 * @returns {Promise<FileInfoResult>}
 *
 * Please note that prettier.getFileInfo() expects opts.plugins to be an array of paths,
 * not an object. A transformation from this array to an object is automatically done
 * internally by the method wrapper. See withPlugins() in index.js.
 */
async function getFileInfo(filePath, opts) {
  if (typeof filePath !== "string") {
    throw new TypeError(
      `expect \`filePath\` to be a string, got \`${typeof filePath}\``
    );
  }

  const ignorer = await createIgnorer(opts.ignorePath, opts.withNodeModules);
  return _getFileInfo({
    ignorer,
    filePath,
    plugins: opts.plugins,
    resolveConfig: opts.resolveConfig,
    ignorePath: opts.ignorePath,
  });
}

function getFileParser(resolvedConfig, filePath, plugins) {
  if (resolvedConfig && resolvedConfig.parser) {
    return resolvedConfig.parser;
  }

  const inferredParser = inferParser(filePath, plugins);

  if (inferredParser) {
    return inferredParser;
  }

  return null;
}

async function _getFileInfo({
  ignorer,
  filePath,
  plugins,
  resolveConfig = false,
  ignorePath,
}) {
  const normalizedFilePath = normalizeFilePath(filePath, ignorePath);

  const fileInfo = {
    ignored: ignorer.ignores(normalizedFilePath),
    inferredParser: null,
  };

  if (fileInfo.ignored) {
    return fileInfo;
  }

  let resolvedConfig;

  if (resolveConfig) {
    const resolvedConfig = await config.resolveConfig(filePath);
    fileInfo.inferredParser = getFileParser(resolvedConfig, filePath, plugins);
    return fileInfo;
  }

  fileInfo.inferredParser = getFileParser(resolvedConfig, filePath, plugins);
  return fileInfo;
}

function normalizeFilePath(filePath, ignorePath) {
  return ignorePath
    ? path.relative(path.dirname(ignorePath), filePath)
    : filePath;
}

export default getFileInfo;
