#!/usr/bin/env node

import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import createEsmUtils from "esm-utils";
import esbuild from "esbuild";
import { outdent } from "outdent";
import { PROJECT_ROOT, writeJson } from "../utils/index.mjs";
import esbuildPluginLicense from "../build/esbuild-plugins/license.mjs";
import vendors from "./vendors.mjs";
import { vendorMetaFile, saveVendorLicenses } from "./utils.mjs";
import esbuildPluginTsNocheck from "./esbuild-plugin-ts-nocheck.mjs";

const { require } = createEsmUtils(import.meta);
const rootDir = new URL("../../", import.meta.url);
// prettier/vendors
const vendorsDir = new URL("./vendors/", rootDir);
// prettier/vendors/*.js
const getVendorFilePath = (vendorName, extension = "js") =>
  fileURLToPath(new URL(`./${vendorName}.${extension}`, vendorsDir));

// Unsafe, but good enough for now.
const isJson = (value) => {
  try {
    assert.deepEqual(JSON.parse(JSON.stringify(value)), { ...value });
    return true;
  } catch {
    return false;
  }
};

async function clean() {
  for (const directoryOrFile of [vendorsDir, vendorMetaFile]) {
    try {
      await fs.rm(directoryOrFile, { recursive: true, force: true });
    } catch {
      // No op
    }
  }
}

async function generateDts({ vendor, module }) {
  const hasDefault = Boolean(module.default);
  await fs.writeFile(
    new URL(`${vendor}.d.ts`, vendorsDir),
    [
      "// This file is generated automatically.",
      hasDefault ? `export {default} from "${vendor}";` : null,
      `export * from "${vendor}";`,
      "",
    ]
      .filter((line) => line !== null)
      .join("\n"),
    "utf8"
  );
}

async function bundle(vendor, options) {
  const outfile = getVendorFilePath(vendor);

  /** @type {import("esbuild").CommonOptions} */
  const esbuildOption = {
    entryPoints: [require.resolve(vendor)],
    bundle: true,
    target: ["node12.17.0"],
    platform: "node",
    plugins: [
      esbuildPluginTsNocheck(),
      esbuildPluginLicense({
        cwd: PROJECT_ROOT,
        thirdParty: {
          includePrivate: true,
          output: options.onLicenseFound,
        },
      }),
    ],
    outfile,
  };
  await esbuild.build(esbuildOption);

  // Still running esbuild, because we want collect license
  const module = await import(vendor);
  if (isJson(module)) {
    await fs.rm(outfile);
    await writeJson(getVendorFilePath(vendor, "json"), module);
    return;
  }

  await generateDts({ vendor, module });
}

async function main() {
  await clean();

  const licenses = [];
  for (const vendor of vendors) {
    await bundle(vendor, {
      onLicenseFound(dependencies) {
        licenses.push(...dependencies);
      },
    });
    console.log(`Bundled: ${vendor}`);
  }

  await saveVendorLicenses(licenses);
  console.log("Vendor licenses saved");

  await fs.writeFile(
    new URL("./README.md", vendorsDir),
    outdent`
      # \`./vendors\`

      **JavaScript Files that included in this directory are auto generated by [\`/scripts/vendor/bundle-vendors.mjs\`](../scripts/vendors/bundle-vendors.mjs).**

      See [\`/scripts/vendors/README.md\`](../scripts/vendors/README.md) for the context.
    ` + "\n"
  );
  console.log("`README.md` file saved");
}

main();
