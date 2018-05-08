"use strict";

const runPrettier = require("../runPrettier");
const EOL = require("os").EOL;

describe("automatically loads 'prettier-plugin-*'", () => {
  runPrettier("plugins/automatic", ["file.txt", "--parser=foo"]).test({
    stdout: "foo+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("automatically loads '@prettier/plugin-*'", () => {
  runPrettier("plugins/automatic", ["file.txt", "--parser=bar"]).test({
    stdout: "bar+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("automatically loads 'prettier-plugin-*' from --plugin-search-dir (same as autoload dir)", () => {
  runPrettier("plugins/automatic", [
    "file.txt",
    "--parser=foo",
    `--plugin-search-dir=.`
  ]).test({
    stdout: "foo+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("automatically loads '@prettier/plugin-*' from --plugin-search-dir (same as autoload dir)", () => {
  runPrettier("plugins/automatic", [
    "file.txt",
    "--parser=bar",
    `--plugin-search-dir=.`
  ]).test({
    stdout: "bar+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("automatically loads 'prettier-plugin-*' from --plugin-search-dir (different to autoload dir)", () => {
  runPrettier("plugins", [
    "automatic/file.txt",
    "--parser=foo",
    `--plugin-search-dir=automatic`
  ]).test({
    stdout: "foo+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("automatically loads '@prettier/plugin-*' from --plugin-search-dir (different to autoload dir)", () => {
  runPrettier("plugins", [
    "automatic/file.txt",
    "--parser=bar",
    `--plugin-search-dir=automatic`
  ]).test({
    stdout: "bar+contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("does not crash when --plugin-search-dir does not contain node_modules", () => {
  runPrettier("plugins/extensions", [
    "file.foo",
    "--plugin=./plugin",
    `--plugin-search-dir=.`
  ]).test({
    stdout: "!contents" + EOL,
    stderr: "",
    status: 0,
    write: []
  });
});

describe("crashes when one of --plugin-search-dir does not exist", () => {
  runPrettier("plugins/automatic", [
    "file.txt",
    "--parser=foo",
    `--plugin-search-dir=non-existing-dir`,
    `--plugin-search-dir=.`
  ]).test({
    stdout: "",
    stderr: "non-existing-dir does not exist or is not a directory",
    status: 1,
    write: []
  });
});
