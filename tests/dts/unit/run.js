import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { default as ts } from "typescript";

describe("Unit tests for dts files", () => {
  test("no errors", () => {
    const testCasesDirPath = url.fileURLToPath(
      new URL("cases", import.meta.url)
    );
    const testCaseFiles = fs
      .readdirSync(testCasesDirPath)
      .map((file) => path.join(testCasesDirPath, file));

    /** @type {import("typescript").CompilerOptions} */
    const compilerOptions = {
      noEmit: true,
      strict: true,
      esModuleInterop: true,
    };

    const program = ts.createProgram(testCaseFiles, compilerOptions);

    /** @type {import("typescript").Diagnostic[]} */
    const diagnostics = ts.getPreEmitDiagnostics(program);

    expect(diagnostics).toEqual([]);
  });
});
