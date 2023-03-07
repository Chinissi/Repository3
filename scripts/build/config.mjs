import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import { createRequire } from "node:module";
import createEsmUtils from "esm-utils";
import {
  PROJECT_ROOT,
  DIST_DIR,
  copyFile,
  writeFile,
} from "../utils/index.mjs";
import buildJavascriptModule from "./build-javascript-module.js";
import buildPackageJson from "./build-package-json.js";
import buildLicense from "./build-license.js";
import buildTypes from "./build-types.js";
import modifyTypescriptModule from "./modify-typescript-module.mjs";
import { getPackageFile } from "./utils.js";

const {
  require,
  dirname,
  resolve: importMetaResolve,
} = createEsmUtils(import.meta);
const resolveEsmModulePath = async (specifier) =>
  url.fileURLToPath(await importMetaResolve(specifier));
const copyFileBuilder = ({ file }) =>
  copyFile(
    path.join(PROJECT_ROOT, file.input),
    path.join(DIST_DIR, file.output.file)
  );

function getTypesFileConfig({ input: jsFileInput, outputBaseName, isPlugin }) {
  let input = jsFileInput;
  if (!isPlugin) {
    input = jsFileInput.replace(/\.[cm]?js$/, ".d.ts");

    if (!fs.existsSync(path.join(PROJECT_ROOT, input))) {
      return;
    }
  }

  return {
    input,
    output: {
      file: outputBaseName + ".d.ts",
    },
    kind: "types",
    isPlugin,
    build: buildTypes,
  };
}

/**
 * @typedef {Object} BuildOptions
 * @property {object[]?} replaceModule - Module replacements
 * @property {string[]?} target - ESBuild targets
 * @property {string[]?} external - array of paths that should not be included in the final bundle
 * @property {boolean?} minify - disable code minification
 *
 * @typedef {Object} Output
 * @property {"esm" | "umd" | "cjs" | "text" | "json"} format - File format
 * @property {string} file - path of the output file in the `dist/` folder
 * @property {string?} umdVariableName - name for the UMD file (for plugins, it'll be `prettierPlugins.${name}`)
 *
 * @typedef {Object} File
 * @property {string} input - input of the file
 * @property {Output} output - output of the file
 * @property {"javascript" | "types" | "meta"} kind - file kind
 * @property {function} build - file generate function
 * @property {"node" | "universal"} platform - ESBuild platform
 * @property {BuildOptions} buildOptions - ESBuild options
 * @property {boolean?} isPlugin - file is a plugin
 */

/*
`diff` use deprecated folder mapping "./" in the "exports" field,
so we can't `import("diff/lib/diff/array.js")` directly.
To reduce the bundle size, replace the entry with smaller files.

We can switch to deep import once https://github.com/kpdecker/jsdiff/pull/351 get merged
*/
const replaceDiffPackageEntry = (file) => ({
  module: getPackageFile("diff/lib/index.mjs"),
  path: getPackageFile(`diff/${file}`),
});

const extensions = {
  esm: ".mjs",
  umd: ".js",
  cjs: ".cjs",
};

const pluginFiles = [
  {
    input: "src/language-js/parse/babel.js",
    replaceModule: [
      {
        // We don't use value of JSXText
        module: require.resolve("@babel/parser"),
        process: (text) =>
          text.replaceAll(
            "const entity = entities[desc];",
            "const entity = undefined"
          ),
      },
    ],
  },
  {
    input: "src/language-js/parse/flow.js",
    replaceModule: [
      {
        module: require.resolve("flow-parser"),
        process: (text) =>
          text
            .replaceAll('require("fs")', "{}")
            .replaceAll('require("constants")', "{}"),
      },
    ],
  },
  {
    input: "src/language-js/parse/typescript.js",
    replaceModule: [
      {
        module: require.resolve("typescript"),
        process: modifyTypescriptModule,
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parser.js"
        ),
        process(text) {
          text = text
            .replace('require("./create-program/createDefaultProgram")', "{}")
            .replace('require("./create-program/createIsolatedProgram")', "{}")
            .replace('require("./create-program/createProjectProgram")', "{}")
            .replace('require("./create-program/useProvidedPrograms")', "{}");
          return text;
        },
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parseSettings/createParseSettings.js"
        ),
        process(text) {
          return text
            .replace('require("./resolveProjectList")', "{}")
            .replace(
              'require("../create-program/shared")',
              "{ensureAbsolutePath: path => path}"
            )
            .replace(
              "process.cwd()",
              JSON.stringify("/prettier-security-dirname-placeholder")
            )
            .replace(
              "parseSettings.projects = ",
              "parseSettings.projects = [] || "
            );
        },
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parseSettings/inferSingleRun.js"
        ),
        text: "exports.inferSingleRun = () => false;",
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parseSettings/ExpiringCache.js"
        ),
        text: "exports.ExpiringCache = class {};",
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parseSettings/getProjectConfigFiles.js"
        ),
        text: "exports.resolveProjectList = () => [];",
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/parseSettings/warnAboutTSVersion.js"
        ),
        text: "exports.warnAboutTSVersion = () => {};",
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/create-program/getScriptKind.js"
        ),
        process: (text) =>
          text.replace(
            'require("path")',
            "{extname: file => file.split('.').pop()}"
          ),
      },
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/version-check.js"
        ),
        text: "exports.typescriptVersionIsAtLeast = new Proxy({}, {get: () => true})",
      },
      // Only needed if `range`/`loc` in parse options is `false`
      {
        module: getPackageFile(
          "@typescript-eslint/typescript-estree/dist/ast-converter.js"
        ),
        process: (text) => text.replace('require("./simple-traverse")', "{}"),
      },
      {
        module: getPackageFile("debug/src/browser.js"),
        path: path.join(dirname, "./shims/debug.js"),
      },
    ],
  },
  {
    input: "src/language-js/parse/acorn-and-espree.js",
    umdPropertyName: "acornAndEspree",
    replaceModule: [
      {
        module: require.resolve("espree"),
        process: (text) =>
          text
            .replaceAll(
              /exports\.(?:Syntax|VisitorKeys|latestEcmaVersion|supportedEcmaVersions|tokenize|version) = .*?;/g,
              ""
            )
            .replaceAll(
              /const (Syntax|VisitorKeys|latestEcmaVersion|supportedEcmaVersions) = /g,
              "const $1 = undefined && "
            )
            .replace("require('eslint-visitor-keys')", "{}"),
      },
      {
        // We don't use value of JSXText
        module: getPackageFile("acorn-jsx/xhtml.js"),
        text: "module.exports = {};",
      },
    ],
  },
  {
    input: "src/language-js/parse/meriyah.js",
    replaceModule: [
      {
        // We don't use value of JSXText
        module: await resolveEsmModulePath("meriyah"),
        find: "parser.tokenValue = decodeHTMLStrict(raw);",
        replacement: "parser.tokenValue = raw;",
      },
    ],
  },
  {
    input: "src/language-js/parse/angular.js",
    replaceModule: [
      // We only use a small set of `@angular/compiler` from `esm2020/src/expression_parser/`
      // Those files can't be imported, they also not directly runnable, because `.mjs` extension is missing
      {
        module: getPackageFile("@angular/compiler/fesm2020/compiler.mjs"),
        text: /* indent */ `
          export * from '../esm2020/src/expression_parser/ast.mjs';
          export {Lexer} from '../esm2020/src/expression_parser/lexer.mjs';
          export {Parser} from '../esm2020/src/expression_parser/parser.mjs';
        `,
      },
      ...[
        "expression_parser/lexer.mjs",
        "expression_parser/parser.mjs",
        "ml_parser/interpolation_config.mjs",
      ].map((file) => ({
        module: getPackageFile(`@angular/compiler/esm2020/src/${file}`),
        process: (text) =>
          text.replaceAll(/(?<=import .*? from )'(.{1,2}\/.*)'/g, "'$1.mjs'"),
      })),
    ],
  },
  {
    input: "src/language-css/parser-postcss.js",
    replaceModule: [
      // The following two replacements prevent load `source-map` module
      {
        module: getPackageFile("postcss/lib/previous-map.js"),
        text: "module.exports = class {};",
      },
      {
        module: getPackageFile("postcss/lib/map-generator.js"),
        text: "module.exports = class { generate() {} };",
      },
      {
        module: getPackageFile("postcss/lib/input.js"),
        process: (text) =>
          text.replace("require('url')", "{}").replace("require('path')", "{}"),
      },
      // `postcss-values-parser` uses constructor.name, it will be changed by bundler
      // https://github.com/shellscape/postcss-values-parser/blob/c00f858ab8c86ce9f06fdb702e8f26376f467248/lib/parser.js#L499
      {
        module: getPackageFile("postcss-values-parser/lib/parser.js"),
        find: "node.constructor.name === 'Word'",
        replacement: "node.type === 'word'",
      },
      // Prevent `node:util`, `node:utl`, and `node:path` shim
      {
        module: getPackageFile("postcss-values-parser/lib/tokenize.js"),
        process: (text) =>
          text
            .replace("require('util')", "{}")
            .replace(
              "let message = util.format('Unclosed %s at line: %d, column: %d, token: %d', what, line, pos - offset, pos);",
              "let message = `Unclosed ${what} at line: ${line}, column: ${pos - offset}, token: ${pos}`;"
            )
            .replace(
              "let message = util.format('Syntax error at line: %d, column: %d, token: %d', line, pos - offset, pos);",
              "let message = `Syntax error at line: ${line}, column: ${pos - offset}, token: ${pos}`;"
            ),
      },
    ],
  },
  "src/language-graphql/parser-graphql.js",
  {
    input: "src/language-markdown/parser-markdown.js",
    replaceModule: [
      {
        module: getPackageFile("parse-entities/decode-entity.browser.js"),
        path: getPackageFile("parse-entities/decode-entity.js"),
      },
    ],
  },
  {
    input: "src/language-handlebars/parser-glimmer.js",
    replaceModule: [
      // See comment in `src/language-handlebars/parser-glimmer.js` file
      {
        module: getPackageFile(
          "@glimmer/syntax/dist/commonjs/es2017/lib/parser/tokenizer-event-handlers.js"
        ),
        path: getPackageFile(
          "@glimmer/syntax/dist/modules/es2017/lib/parser/tokenizer-event-handlers.js"
        ),
      },
      // This passed to plugins, our plugin don't need access to the options
      {
        module: getPackageFile(
          "@glimmer/syntax/dist/modules/es2017/lib/parser/tokenizer-event-handlers.js"
        ),
        process: (text) =>
          text.replace(/\nconst syntax = \{.*?\n\};/su, "\nconst syntax = {};"),
      },
      {
        module: getPackageFile("@handlebars/parser/dist/esm/index.js"),
        path: getPackageFile("@handlebars/parser/dist/esm/parse.js"),
      },
    ],
  },
  "src/language-html/parser-html.js",
  "src/language-yaml/parser-yaml.js",
].map((file) => {
  if (typeof file === "string") {
    file = { input: file };
  }

  let { input, umdPropertyName, outputBaseName, ...buildOptions } = file;

  outputBaseName ??= input.match(
    /(?:parser-|parse\/)(?<outputBaseName>.*?)\.js$/
  ).groups.outputBaseName;

  const umdVariableName = `prettierPlugins.${
    umdPropertyName ?? outputBaseName
  }`;

  return {
    input,
    outputBaseName: `plugins/${outputBaseName}`,
    umdVariableName,
    buildOptions,
    isPlugin: true,
  };
});

const nonPluginUniversalFiles = [
  {
    input: "src/document/public.js",
    outputBaseName: "doc",
    umdVariableName: "doc",
    minify: false,
  },
  {
    input: "src/standalone.js",
    umdVariableName: "prettier",
    replaceModule: [
      {
        module: require.resolve("@babel/highlight"),
        path: path.join(dirname, "./shims/babel-highlight.js"),
      },
      {
        module: createRequire(require.resolve("vnopts")).resolve("chalk"),
        path: path.join(dirname, "./shims/chalk.js"),
      },
      replaceDiffPackageEntry("lib/diff/array.js"),
    ],
  },
].map((file) => {
  const {
    input,
    outputBaseName = path.basename(input, ".js"),
    umdVariableName,
    ...buildOptions
  } = file;

  return {
    input,
    outputBaseName,
    umdVariableName,
    buildOptions,
  };
});

const universalFiles = [...nonPluginUniversalFiles, ...pluginFiles].flatMap(
  (file) => {
    let { input, outputBaseName, umdVariableName, buildOptions, isPlugin } =
      file;

    outputBaseName ??= path.basename(input);

    return [
      ...[
        {
          format: "esm",
          file: `${outputBaseName}${extensions.esm}`,
        },
        {
          format: "umd",
          file: `${outputBaseName}${extensions.umd}`,
          umdVariableName,
        },
      ].map((output) => ({
        input,
        output,
        platform: "universal",
        buildOptions,
        isPlugin,
        build: buildJavascriptModule,
        kind: "javascript",
      })),
      getTypesFileConfig({ input, outputBaseName, isPlugin }),
    ];
  }
);

const nodejsFiles = [
  {
    input: "src/index.js",
    replaceModule: [
      {
        module: require.resolve("@iarna/toml/lib/toml-parser.js"),
        find: "const utilInspect = eval(\"require('util').inspect\")",
        replacement: "const utilInspect = require('util').inspect",
      },
      // `editorconfig` use a older version of `semver` and only uses `semver.gte`
      {
        module: require.resolve("editorconfig"),
        find: 'var semver = __importStar(require("semver"));',
        replacement: `
          var semver = {
            gte: require(${JSON.stringify(
              require.resolve("semver/functions/gte")
            )})
          };
        `,
      },
      {
        module: require.resolve("n-readlines"),
        find: "const readBuffer = new Buffer(this.options.readChunk);",
        replacement: "const readBuffer = Buffer.alloc(this.options.readChunk);",
      },
      replaceDiffPackageEntry("lib/diff/array.js"),
    ],
  },
  {
    input: "src/index.cjs",
  },
  {
    input: "bin/prettier.cjs",
    outputBaseName: "bin/prettier",
    target: ["node0.10"],
    replaceModule: [
      {
        module: path.join(PROJECT_ROOT, "bin/prettier.cjs"),
        process: (text) =>
          text.replace('"../src/cli/index.js"', '"../internal/cli.mjs"'),
      },
    ],
  },
  {
    input: "src/cli/index.js",
    outputBaseName: "internal/cli",
    external: ["benchmark"],
    replaceModule: [replaceDiffPackageEntry("lib/patch/create.js")],
  },
  {
    input: "src/common/third-party.js",
    outputBaseName: "internal/third-party",
    replaceModule: [
      // cosmiconfig@6 -> import-fresh can't find parentModule, since module is bundled
      {
        module: require.resolve("parent-module"),
        path: path.join(dirname, "./shims/parent-module.cjs"),
      },
    ],
  },
].flatMap((file) => {
  let { input, output, outputBaseName, ...buildOptions } = file;

  const format = input.endsWith(".cjs") ? "cjs" : "esm";
  outputBaseName ??= path.basename(input, path.extname(input));

  return [
    {
      input,
      output: {
        format,
        file: `${outputBaseName}${extensions[format]}`,
      },
      platform: "node",
      buildOptions,
      build: buildJavascriptModule,
      kind: "javascript",
    },
    getTypesFileConfig({ input, outputBaseName }),
  ];
});

const metaFiles = [
  {
    input: "package.json",
    output: {
      format: "json",
    },
    build: buildPackageJson,
  },
  {
    input: "README.md",
    build: copyFileBuilder,
  },
  {
    input: "LICENSE",
    build: buildLicense,
  },
].map((file) => ({
  ...file,
  output: { file: file.input, ...file.output },
  kind: "meta",
}));

/** @type {Files[]} */
const files = [...nodejsFiles, ...universalFiles, ...metaFiles].filter(Boolean);
export default files;
