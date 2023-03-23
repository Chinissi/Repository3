import createParsers from "../utils/create-parsers.js";
import parsersConfig from "./parsers-config.js";
import printer from "./printer-markdown.js";

export const printers = {
  mdast: printer,
};
export const parsers = createParsers(parsersConfig);
export { default as languages } from "./languages.evaluate.js";
export { default as options } from "./options.js";
