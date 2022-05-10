import { createRequire } from "node:module";
import { ConfigError } from "../common/errors.js";
import { locStart, locEnd } from "../language-js/loc.js";
import loadParser from "./load-parser.js";

const require = createRequire(import.meta.url);

// Use defineProperties()/getOwnPropertyDescriptor() to prevent
// triggering the parsers getters.
const ownNames = Object.getOwnPropertyNames;
const ownDescriptor = Object.getOwnPropertyDescriptor;
function getParsers(options) {
  const parsers = {};
  for (const plugin of options.plugins) {
    // TODO: test this with plugins
    /* istanbul ignore next */
    if (!plugin.parsers) {
      continue;
    }

    for (const name of ownNames(plugin.parsers)) {
      Object.defineProperty(parsers, name, ownDescriptor(plugin.parsers, name));
    }
  }

  return parsers;
}

function resolveParser(opts, parsers = getParsers(opts)) {
  if (typeof opts.parser === "function") {
    // Custom parser API always works with JavaScript.
    return {
      parse: opts.parser,
      astFormat: "estree",
      locStart,
      locEnd,
    };
  }

  if (typeof opts.parser === "string") {
    if (Object.prototype.hasOwnProperty.call(parsers, opts.parser)) {
      return parsers[opts.parser];
    }

    /* istanbul ignore next */
    if (process.env.PRETTIER_TARGET === "universal") {
      throw new ConfigError(
        `Couldn't resolve parser "${opts.parser}". Parsers must be explicitly added to the standalone bundle.`
      );
    }

    return loadParser(opts.parser);
  }
}

function callPluginParseFunction(originalText, opts) {
  const parsers = getParsers(opts);

  // Create a new object {parserName: parseFn}. Uses defineProperty() to only call
  // the parsers getters when actually calling the parser `parse` function.
  const parsersForCustomParserApi = Object.defineProperties(
    {},
    Object.fromEntries(
      Object.keys(parsers).map((parserName) => [
        parserName,
        {
          enumerable: true,
          get() {
            return parsers[parserName].parse;
          },
        },
      ])
    )
  );

  const parser = resolveParser(opts, parsers);

  try {
    const text = parser.preprocess
      ? parser.preprocess(originalText, opts)
      : originalText;
    const result = parser.parse(text, parsersForCustomParserApi, opts);

    return { text, result };
  } catch (error) {
    handleParseError(error, originalText);
  }
}

function handleParseError(error, text) {
  const { loc } = error;

  if (loc) {
    const { codeFrameColumns } = require("@babel/code-frame");
    error.codeFrame = codeFrameColumns(text, loc, { highlightCode: true });
    error.message += "\n" + error.codeFrame;
    throw error;
  }

  /* istanbul ignore next */
  throw error.stack;
}

async function parse(originalText, opts) {
  const { text, result } = callPluginParseFunction(originalText, opts);

  try {
    return { text, ast: await result };
  } catch (error) {
    handleParseError(error, originalText);
  }
}

function parseSync(originalText, opts) {
  const { text, result } = callPluginParseFunction(originalText, opts);
  return { text, ast: result };
}

export { parse, parseSync, resolveParser };
