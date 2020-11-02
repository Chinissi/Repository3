"use strict";

const path = require("path");
const shell = require("shelljs");
const tempy = require("tempy");

shell.config.fatal = true;

const rootDir = path.join(__dirname, "..");
const client = process.env.NPM_CLIENT || "npm";
const packageDir =
  process.env.NODE_ENV === "production" ? path.join(rootDir, "dist") : rootDir;

module.exports = () => {
  const tmpDir = tempy.directory();
  const file = shell.exec("npm pack", { cwd: packageDir }).stdout.trim();
  shell.mv(path.join(packageDir, file), tmpDir);
  const tarPath = path.join(tmpDir, file);

  shell.exec("npm init -y", { cwd: tmpDir, silent: true });
  let installCommand = "";
  switch (client) {
    case "yarn":
      // yarn fails when engine requirement not compatible by default
      installCommand = `yarn set version classic && yarn add "${tarPath}"`;
      break;
    case "pnpm":
      // Note: current pnpm can't work with `--engine-strict` and engineStrict setting in `.npmrc`
      installCommand = `pnpm add "${tarPath}"`;
      break;
    default:
      // npm fails when engine requirement only with `--engine-strict`
      installCommand = `npm install "${tarPath}" --engine-strict`;
      break;
  }

  console.log({ installCommand, tmpDir });

  shell.exec(installCommand, { cwd: tmpDir });

  return path.join(tmpDir, "node_modules/prettier");
};
