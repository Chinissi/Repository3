import path from "node:path";
import { resolveConfigFile } from "../index.js";
import { printToScreen } from "./utils.js";

async function logResolvedConfigPathOrDie(context) {
  const file = context.argv.findConfigPath;
  const configFile = await resolveConfigFile(file);
  if (configFile) {
    printToScreen(path.relative(process.cwd(), configFile));
  } else {
    throw new Error(`Can not find configure file for "${file}"`);
  }
}

export default logResolvedConfigPathOrDie;
