#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import globby from "globby";
import prettier from "prettier";
import createEsmUtils from "esm-utils";
import shell from "shelljs";
import {
  PROJECT_ROOT,
  DIST_DIR,
  WEBSITE_DIR,
  readJson,
  writeJson,
  copyFile,
  writeFile,
} from "./utils/index.mjs";

shell.config.fatal = true;
const { require } = createEsmUtils(import.meta);
const IS_PULL_REQUEST = process.env.PULL_REQUEST === "true";
const PRETTIER_PATH = IS_PULL_REQUEST
  ? DIST_DIR
  : path.dirname(require.resolve("prettier"));
const PLAYGROUND_PRETTIER_DIR = path.join(WEBSITE_DIR, "static/lib");

async function buildPrettier() {
  // --- Build prettier for PR ---
  const packageJsonFile = path.join(PROJECT_ROOT, "package.json");
  const content = await fs.readFile(packageJsonFile);
  const packageJson = await readJson(packageJsonFile);
  await writeJson(packageJsonFile, {
    ...packageJson,
    version: `999.999.999-pr.${process.env.REVIEW_ID}`,
  });

  shell.exec("yarn build --playground");

  // restore
  await writeFile(packageJsonFile, content);
}

async function buildPlaygroundFiles() {
  const files = globby.sync(["standalone.js", "parser-*.js"], {
    cwd: PRETTIER_PATH,
  });
  const parsers = {};
  for (const fileName of files) {
    const file = path.join(PRETTIER_PATH, fileName);
    await copyFile(file, path.join(PLAYGROUND_PRETTIER_DIR, fileName));

    if (fileName === "standalone.js") {
      continue;
    }

    const plugin = require(file);
    const property = fileName.replace(/\.js$/, "").split("-")[1];
    parsers[fileName] = {
      property,
      parsers: Object.keys(plugin.parsers),
    };
  }

  await writeFile(
    path.join(PLAYGROUND_PRETTIER_DIR, "parsers-location.js"),
    prettier.format(
      `
      "use strict";

      const parsersLocation = ${JSON.stringify(parsers)};
    `,
      { parser: "babel" }
    )
  );
}

(async () => {
  if (IS_PULL_REQUEST) {
    console.log("Building prettier...");
    await buildPrettier();
  }

  console.log("Preparing files for playground...");
  await buildPlaygroundFiles();

  // --- Site ---
  shell.cd(WEBSITE_DIR);

  console.log("Installing website dependencies...");
  shell.exec("yarn install");

  console.log("Building website...");
  shell.exec("yarn build");
})();
