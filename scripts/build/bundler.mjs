import path from "node:path";
import camelCase from "camelcase";
import { rollup } from "rollup";
import { nodeResolve as rollupPluginNodeResolve } from "@rollup/plugin-node-resolve";
import rollupPluginAlias from "@rollup/plugin-alias";
import rollupPluginCommonjs from "@rollup/plugin-commonjs";
import rollupPluginPolyfillNode from "rollup-plugin-polyfill-node";
import rollupPluginJson from "@rollup/plugin-json";
import rollupPluginReplace from "@rollup/plugin-replace";
import { terser as rollupPluginTerser } from "rollup-plugin-terser";
import { babel as rollupPluginBabel } from "@rollup/plugin-babel";
import rollupPluginLicense from "rollup-plugin-license";
import createEsmUtils from "esm-utils";
import builtinModules from "builtin-modules";
import esbuild from "esbuild";
import { NodeModulesPolyfillPlugin as esbuildPluginNodeModulePolyfills } from "@esbuild-plugins/node-modules-polyfill";
import { NodeGlobalsPolyfillPlugin as esbuildPluginNodeGlobalsPolyfills } from "@esbuild-plugins/node-globals-polyfill";
import esbuildPluginBabel from "esbuild-plugin-babel";
import esbuildPluginTextReplace from "esbuild-plugin-text-replace";
import { PROJECT_ROOT, DIST_DIR } from "../utils/index.mjs";
import esbuildPluginEvaluate from "./esbuild-plugins/evaluate.mjs";
import esbuildPluginReplaceModule from "./esbuild-plugins/replace-module.mjs";
import rollupPluginExecutable from "./rollup-plugins/executable.mjs";
import rollupPluginEvaluate from "./rollup-plugins/evaluate.mjs";
import rollupPluginReplaceModule from "./rollup-plugins/replace-module.mjs";
import bundles from "./config.mjs";

const { json, __dirname } = createEsmUtils(import.meta);
const packageJson = json.loadSync("../../package.json");

const entries = [
  // Force using the CJS file, instead of ESM; i.e. get the file
  // from `"main"` instead of `"module"` (rollup default) of package.json
  {
    find: "@angular/compiler/src",
    replacement: path.resolve(
      `${PROJECT_ROOT}/node_modules/@angular/compiler/esm2015/src`
    ),
  },
];

function getBabelConfig(bundle) {
  const config = {
    babelrc: false,
    assumptions: {
      setSpreadProperties: true,
    },
    sourceType: "unambiguous",
    plugins: bundle.babelPlugins || [],
    compact: bundle.type === "plugin" ? false : "auto",
    exclude: [/\/core-js\//],
  };
  const targets = { node: "12" };
  if (bundle.target === "universal") {
    targets.browsers = packageJson.browserslist;
  }
  config.presets = [
    [
      "@babel/preset-env",
      {
        targets,
        exclude: [
          "es.array.unscopables.flat-map",
          "es.promise",
          "es.promise.finally",
          "es.string.replace",
          "es.symbol.description",
          "es.typed-array.*",
          "web.*",
        ],
        modules: false,
        useBuiltIns: "usage",
        corejs: {
          version: 3,
        },
        debug: false,
      },
    ],
  ];
  config.plugins.push([
    "@babel/plugin-proposal-object-rest-spread",
    { useBuiltIns: true },
  ]);
  return config;
}

function getRollupConfig(bundle, options) {
  const config = {
    input: path.join(PROJECT_ROOT, bundle.input),
    onwarn(warning) {
      if (
        // ignore `MIXED_EXPORTS` warn
        warning.code === "MIXED_EXPORTS" ||
        (warning.code === "CIRCULAR_DEPENDENCY" &&
          (warning.importer.startsWith("node_modules") ||
            warning.importer.startsWith("\x00polyfill-node."))) ||
        warning.code === "SOURCEMAP_ERROR" ||
        warning.code === "THIS_IS_UNDEFINED"
      ) {
        return;
      }

      // web bundle can't have external requires
      if (
        warning.code === "UNRESOLVED_IMPORT" &&
        bundle.target === "universal"
      ) {
        throw new Error(
          `Unresolved dependency in universal bundle: ${warning.source}`
        );
      }

      console.warn(warning);
    },
    external: [],
  };

  const replaceStrings = {
    "process.env.PRETTIER_TARGET": JSON.stringify(bundle.target),
    "process.env.NODE_ENV": JSON.stringify("production"),
  };
  if (bundle.target === "universal") {
    // We can't reference `process` in UMD bundles and this is
    // an undocumented "feature"
    replaceStrings["process.env.PRETTIER_DEBUG"] = "global.PRETTIER_DEBUG";
    // `rollup-plugin-node-globals` replace `__dirname` with the real dirname
    // `parser-typescript.js` will contain a path of working directory
    // See #8268
    replaceStrings.__filename = JSON.stringify(
      "/prettier-security-filename-placeholder.js"
    );
    replaceStrings.__dirname = JSON.stringify(
      "/prettier-security-dirname-placeholder"
    );
  }
  Object.assign(replaceStrings, bundle.replace);

  const babelConfig = { babelHelpers: "bundled", ...getBabelConfig(bundle) };

  const alias = { ...bundle.alias };
  alias.entries = [...entries, ...(alias.entries || [])];

  const replaceModule = {};
  // Replace other bundled files
  if (bundle.target === "node") {
    // Replace package.json with dynamic `require("./package.json")`
    replaceModule[path.join(PROJECT_ROOT, "package.json")] = "./package.json";

    // Dynamic require bundled files
    for (const item of bundles) {
      if (item.input !== bundle.input) {
        replaceModule[path.join(PROJECT_ROOT, item.input)] = `./${item.output}`;
      }
    }
  } else {
    // Universal bundle only use version info from package.json
    // Replace package.json with `{version: "{VERSION}"}`
    replaceModule[path.join(PROJECT_ROOT, "package.json")] = {
      code: `export default ${JSON.stringify({
        version: packageJson.version,
      })};`,
    };

    // Replace parser getters with `undefined`
    for (const file of [
      "src/language-css/parsers.js",
      "src/language-graphql/parsers.js",
      "src/language-handlebars/parsers.js",
      "src/language-html/parsers.js",
      "src/language-js/parse/parsers.js",
      "src/language-markdown/parsers.js",
      "src/language-yaml/parsers.js",
    ]) {
      replaceModule[path.join(PROJECT_ROOT, file)] = {
        code: "export default undefined;",
      };
    }
  }

  Object.assign(replaceModule, bundle.replaceModule);

  config.plugins = [
    rollupPluginReplace({
      values: replaceStrings,
      delimiters: ["", ""],
      preventAssignment: true,
    }),
    rollupPluginExecutable(),
    rollupPluginEvaluate(),
    rollupPluginJson({
      exclude: Object.keys(replaceModule)
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.relative(PROJECT_ROOT, file)),
    }),
    rollupPluginAlias(alias),
    rollupPluginNodeResolve({
      extensions: [".js", ".json"],
      preferBuiltins: bundle.target === "node",
      mainFields: ["main"],
    }),
    rollupPluginCommonjs({
      ignoreGlobal: bundle.target === "node",
      ignore:
        bundle.type === "plugin"
          ? undefined
          : (id) => /\.\/parser-.*?/.test(id),
      requireReturnsDefault: "preferred",
      ignoreDynamicRequires: true,
      ignoreTryCatch: bundle.target === "node",
      ...bundle.commonjs,
    }),
    rollupPluginReplaceModule(replaceModule),
    bundle.target === "universal" && rollupPluginPolyfillNode(),
    rollupPluginBabel(babelConfig),
    options.onLicenseFound &&
      rollupPluginLicense({
        cwd: PROJECT_ROOT,
        thirdParty: {
          includePrivate: true,
          output: options.onLicenseFound,
        },
      }),
  ].filter(Boolean);

  if (bundle.target === "node") {
    config.external.push(...builtinModules);
  }
  if (bundle.external) {
    config.external.push(...bundle.external);
  }

  return config;
}

function getRollupOutputOptions(bundle, buildOptions) {
  const options = {
    // Avoid warning form #8797
    exports: "auto",
    file: path.join(DIST_DIR, bundle.output),
    name: bundle.name,
    plugins: [],
  };

  let shouldMinify = buildOptions.minify;
  if (typeof shouldMinify !== "boolean") {
    shouldMinify = bundle.minify !== false && bundle.target === "universal";
  }

  if (shouldMinify) {
    options.plugins.push(
      rollupPluginTerser({
        output: {
          ascii_only: true,
        },
      })
    );
  }

  if (bundle.target === "node") {
    options.format = "cjs";
  } else if (bundle.target === "universal") {
    if (!bundle.format) {
      return [
        {
          ...options,
          format: "umd",
        },
        !buildOptions.playground && {
          ...options,
          format: "esm",
          file: path.join(
            DIST_DIR,
            `esm/${bundle.output.replace(".js", ".mjs")}`
          ),
        },
      ].filter(Boolean);
    }
    options.format = bundle.format;
  }

  if (buildOptions.playground) {
    return { skipped: true };
  }

  return [options];
}

function getUmdWrapper(name) {
  const path = name.split(".");
  const temporaryName = camelCase(name);
  const placeholder = "/*! bundled code !*/";

  let globalObjectText = [];
  for (let index = 0; index < path.length; index++) {
    const object = ["root", ...path.slice(0, index + 1)].join(".");
    if (index === path.length - 1) {
      globalObjectText.push(`${object} = factory();`);
    } else {
      globalObjectText.push(`${object} = ${object} || {};`);
    }
  }
  globalObjectText = globalObjectText.map((text) => `    ${text}`).join("\n");

  let wrapper = `
    (function (factory) {
      if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
      } else if (typeof define === 'function' && define.amd) {
        define(factory);
      } else {
        var root = typeof globalThis !== 'undefined' ? globalThis : global || self;
        ${globalObjectText}
      }
    })(function() {
      ${placeholder}
      return ${temporaryName};
    });
  `;

  wrapper = esbuild
    .buildSync({
      stdin: { contents: wrapper },
      minify: true,
      write: false,
    })
    .outputFiles[0].text.trim();

  const [intro, outro] = wrapper.split(placeholder);

  return { name: temporaryName, intro, outro };
}

function getEsbuildUmdOptions(options) {
  const umdWrapper = getUmdWrapper(options.globalName);
  options.banner = options.banner || {};
  options.footer = options.footer || {};
  options.banner.js = umdWrapper.intro;
  options.footer.js = umdWrapper.outro;
  options.globalName = umdWrapper.name;
  return options;
}

async function createBundleByEsbuild(bundle, cache, options) {
  const replaceStrings = {
    "process.env.PRETTIER_TARGET": JSON.stringify(bundle.target),
    "process.env.NODE_ENV": JSON.stringify("production"),
    // `tslib` exports global variables
    "createExporter(root": "createExporter({}",
  };
  if (bundle.target === "universal") {
    // We can't reference `process` in UMD bundles and this is
    // an undocumented "feature"
    replaceStrings["process.env.PRETTIER_DEBUG"] = "global.PRETTIER_DEBUG";
    // `rollup-plugin-node-globals` replace `__dirname` with the real dirname
    // `parser-typescript.js` will contain a path of working directory
    // See #8268
    replaceStrings.__filename = JSON.stringify(
      "/prettier-security-filename-placeholder.js"
    );
    replaceStrings.__dirname = JSON.stringify(
      "/prettier-security-dirname-placeholder"
    );
  }
  Object.assign(replaceStrings, bundle.replace);

  let shouldMinify = options.minify;
  if (typeof shouldMinify !== "boolean") {
    shouldMinify = bundle.minify !== false && bundle.target === "universal";
  }

  const replaceModule = {};
  // Replace other bundled files
  if (bundle.target === "node") {
    // Replace package.json with dynamic `require("./package.json")`
    replaceModule[path.join(PROJECT_ROOT, "package.json")] = "./package.json";

    // Dynamic require bundled files
    for (const item of bundles) {
      if (item.input !== bundle.input) {
        replaceModule[path.join(PROJECT_ROOT, item.input)] = `./${item.output}`;
      }
    }
  } else {
    // Universal bundle only use version info from package.json
    // Replace package.json with `{version: "{VERSION}"}`
    replaceModule[path.join(PROJECT_ROOT, "package.json")] = {
      code: `module.exports = ${JSON.stringify({
        version: packageJson.version,
      })};`,
    };

    // Replace parser getters with `undefined`
    for (const file of [
      "src/language-css/parsers.js",
      "src/language-graphql/parsers.js",
      "src/language-handlebars/parsers.js",
      "src/language-html/parsers.js",
      "src/language-js/parse/parsers.js",
      "src/language-markdown/parsers.js",
      "src/language-yaml/parsers.js",
    ]) {
      replaceModule[path.join(PROJECT_ROOT, file)] = {
        code: "export default undefined;",
      };
    }
  }

  Object.assign(replaceModule, bundle.replaceModule);

  const esbuildOptions = {
    entryPoints: [path.join(PROJECT_ROOT, bundle.input)],
    bundle: true,
    plugins: [
      bundle.target === "universal" && esbuildPluginNodeGlobalsPolyfills(),
      bundle.target === "universal" && esbuildPluginNodeModulePolyfills(),
      esbuildPluginEvaluate(),
      esbuildPluginReplaceModule(replaceModule),
      esbuildPluginTextReplace({
        include: /\.js$/,
        // TODO[@fisker]: Use RegExp when possible
        pattern: Object.entries(replaceStrings),
      }),
      esbuildPluginBabel({
        filter: /\.[cm]?js$/,
        config: getBabelConfig(bundle),
      }),
    ].filter(Boolean),
    // minify: shouldMinify,
    legalComments: "none",
    external: [...(bundle.external || [])],
    // Disable esbuild auto discover `tsconfig.json` file
    tsconfig: path.join(__dirname, "empty-tsconfig.json"),
  };

  if (bundle.target === "universal") {
    await esbuild.build(
      getEsbuildUmdOptions({
        ...esbuildOptions,
        globalName: bundle.name,
        outfile: path.join(DIST_DIR, bundle.output),
      })
    );
  } else {
    await esbuild.build({
      ...esbuildOptions,
      outfile: path.join(DIST_DIR, bundle.output),
      format: "cjs",
      external: [
        ...esbuildOptions.external,
        ...builtinModules,
        "./package.json*",
        ...bundles
          .filter((item) => item.input !== bundle.input)
          .map((item) => `./${item.output}*`),
      ],
    });
  }

  if (bundle.target === "universal" && !bundle.format && !options.playground) {
    await esbuild.build({
      ...esbuildOptions,
      outfile: path.join(
        DIST_DIR,
        `esm/${bundle.output.replace(".js", ".mjs")}`
      ),
      format: "esm",
    });
  }
  return { bundled: true };
}

async function createBundle(bundle, cache, options) {
  if (bundle.bundler === "esbuild") {
    return createBundleByEsbuild(bundle, cache, options);
  }

  const inputOptions = getRollupConfig(bundle, options);
  const outputOptions = getRollupOutputOptions(bundle, options);

  if (!Array.isArray(outputOptions) && outputOptions.skipped) {
    return { skipped: true };
  }

  if (
    cache &&
    (
      await Promise.all(
        outputOptions.map((outputOption) =>
          cache.isCached(inputOptions, outputOption)
        )
      )
    ).every((cached) => cached)
  ) {
    return { cached: true };
  }

  const result = await rollup(inputOptions);
  await Promise.all(outputOptions.map((option) => result.write(option)));

  return { bundled: true };
}

export default createBundle;
