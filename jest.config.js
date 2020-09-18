"use strict";

const installPrettier = require("./scripts/install-prettier");

const isProduction = process.env.NODE_ENV === "production";
const ENABLE_CODE_COVERAGE = !!process.env.ENABLE_CODE_COVERAGE;
if (isProduction || process.env.INSTALL_PACKAGE) {
  process.env.PRETTIER_DIR = installPrettier();
}
const { TEST_STANDALONE } = process.env;

const testPathIgnorePatterns = [];
let transform;
if (TEST_STANDALONE) {
  testPathIgnorePatterns.push("<rootDir>/tests_integration/");
}
if (isProduction) {
  // `esm` bundles need transform
  transform = {
    "(?:\\.mjs|codeSamples\\.js)$": [
      "babel-jest",
      {
        presets: [
          [
            "@babel/env",
            // Workaround for https://github.com/babel/babel/issues/11994
            { loose: true },
          ],
        ],
      },
    ],
  };
} else {
  // Only test bundles for production
  testPathIgnorePatterns.push(
    "<rootDir>/tests_integration/__tests__/bundle.js"
  );
}

module.exports = {
  setupFiles: ["<rootDir>/tests_config/setup.js"],
  snapshotSerializers: [
    "jest-snapshot-serializer-raw",
    "jest-snapshot-serializer-ansi",
  ],
  testRegex: "jsfmt\\.spec\\.js$|__tests__/.*\\.js$",
  testPathIgnorePatterns,
  collectCoverage: ENABLE_CODE_COVERAGE,
  collectCoverageFrom: ["<rootDir>/src/**/*.js", "<rootDir>/bin/**/*.js"],
  coveragePathIgnorePatterns: [
    "<rootDir>/src/standalone.js",
    "<rootDir>/src/document/doc-debug.js",
  ],
  coverageReporters: ["text", "lcov"],
  moduleNameMapper: {
    "prettier-local": "<rootDir>/tests_config/require_prettier.js",
    "prettier-standalone": "<rootDir>/tests_config/require_standalone.js",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist"],
  testEnvironment: "node",
  transform,
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
  ],
  verbose: Boolean(process.env.FULL_TEST),
};
