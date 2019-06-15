"use strict";

const estreePrinter = require("./printer-estree");
const estreeJsonPrinter = require("./printer-estree-json");
const options = require("./options");
const createLanguage = require("../utils/create-language");

const languages = [
  createLanguage(require("linguist-languages/data/JavaScript"), {
    override: {
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascript"],
      interpreters: ["node", "nodejs"]
    }
  }),
  createLanguage(require("linguist-languages/data/JavaScript"), {
    override: {
      name: "Flow",
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascript"],

      aliases: [],
      filenames: [],
      extensions: [".js.flow"],
      interpreters: ["node"]
    }
  }),
  createLanguage(require("linguist-languages/data/JSX"), {
    override: {
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascriptreact"]
    }
  }),
  createLanguage(require("linguist-languages/data/TypeScript"), {
    override: {
      since: "1.4.0",
      parsers: ["typescript"],
      vscodeLanguageIds: ["typescript", "typescriptreact"],
      extensions: [".ts", ".tsx"]
    }
  }),
  createLanguage(require("linguist-languages/data/JSON"), {
    override: {
      name: "JSON.stringify",
      since: "1.13.0",
      parsers: ["json-stringify"],
      vscodeLanguageIds: ["json"],
      group: "JavaScript",
      extensions: [], // .json file defaults to json instead of json-stringify
      filenames: ["package.json", "package-lock.json", "composer.json"]
    }
  }),
  createLanguage(require("linguist-languages/data/JSON"), {
    override: {
      since: "1.5.0",
      parsers: ["json"],
      vscodeLanguageIds: ["json"],
      group: "JavaScript"
    },
    extend: {
      filenames: [".prettierrc"]
    }
  }),
  createLanguage(require("linguist-languages/data/JSON with Comments"), {
    override: {
      since: "1.5.0",
      parsers: ["json"],
      vscodeLanguageIds: ["jsonc"]
    },
    extend: {
      filenames: [".eslintrc"]
    }
  }),
  createLanguage(require("linguist-languages/data/JSON5"), {
    override: {
      since: "1.13.0",
      parsers: ["json5"],
      vscodeLanguageIds: ["json5"]
    }
  })
];

const printers = {
  estree: estreePrinter,
  "estree-json": estreeJsonPrinter
};

module.exports = {
  languages,
  options,
  printers
};
