#!/usr/bin/env node

"use strict";

const path = require("path");
const shell = require("shelljs");
const pkg = require("../../package.json");
const formatMarkdown = require("../../website/static/markdown");
const externals = require("./externals");

const rootDir = path.join(__dirname, "..", "..");

process.env.PATH += path.delimiter + path.join(rootDir, "node_modules", ".bin");

function pipe(string) {
  return new shell.ShellString(string);
}

shell.set("-e");
shell.cd(rootDir);

shell.rm("-Rf", "dist/");

shell.echo("Bundling externals...");
shell.exec("rollup -c scripts/build/rollup.externals.config.js");

shell.echo("Building internals...");
pipe(JSON.stringify(require("./babelrc"), null, 2)).to(".babelrc");
shell.exec("babel --copy-files src -d dist/src");
shell.exec("babel --copy-files bin -d dist/bin");
shell.exec("babel --copy-files index.js -d dist");

shell.echo("Update ISSUE_TEMPLATE.md");
const issueTemplate = shell.cat(".github/ISSUE_TEMPLATE.md").stdout;
const newIssueTemplate = issueTemplate.replace(
  /-->[^]*$/,
  "-->\n\n" +
    formatMarkdown(
      "// code snippet",
      "// code snippet",
      "",
      pkg.version,
      "https://prettier.io/playground/#.....",
      { parser: "babylon" },
      [["# Options (if any):", true], ["--single-quote", true]],
      true
    )
);
pipe(newIssueTemplate).to(".github/ISSUE_TEMPLATE.md");

shell.echo("Copy package.json");
pkg.bundledDependencies = externals.map(
  external => external.pkg || external.name
);
pkg.scripts = {
  prepublishOnly:
    "node -e \"assert.equal(require('.').version, require('..').version)\""
};
pipe(JSON.stringify(pkg, null, 2)).to("dist/package.json");

shell.echo("Copy README.md");
shell.cp("README.md", "dist/README.md");

shell.echo("Done!");
shell.echo();
shell.echo("How to test against dist:");
shell.echo("  1) yarn test:dist");
shell.echo();
shell.echo("How to publish:");
shell.echo("  1) IMPORTANT!!! Go to dist/");
shell.echo("  2) npm publish");
