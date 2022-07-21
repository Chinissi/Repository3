import { pathToFileURL } from "node:url";
import { resolve } from "import-meta-resolve";

async function importFromFile(specifier, parent) {
  const url = await resolve(specifier, pathToFileURL(parent).href);
  return import(url);
}

export default importFromFile;
