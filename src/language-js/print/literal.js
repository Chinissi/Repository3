"use strict";
const { printString, printNumber } = require("../../common/util.js");
const {
  builders: { join, literalline },
} = require("../../document/index.js");

function printLiteral(path, options /*, print*/) {
  const node = path.getNode();

  switch (node.type) {
    case "RegExpLiteral": // Babel 6 Literal split
      return printRegex(node);
    case "BigIntLiteral":
      // babel: node.extra.raw, flow: node.bigint
      return printBigInt(node.bigint || node.extra.raw);
    case "NumericLiteral": // Babel 6 Literal split
      return printNumber(node.extra.raw);
    case "StringLiteral": // Babel 6 Literal split
      const string = printString(node.extra.raw, options);

      return printIndentableString(string);
    case "NullLiteral": // Babel 6 Literal split
      return "null";
    case "BooleanLiteral": // Babel 6 Literal split
      return String(node.value);
    case "DecimalLiteral":
      return printNumber(node.value) + "m";
    case "Literal": {
      if (node.regex) {
        return printRegex(node.regex);
      }

      if (node.bigint) {
        return printBigInt(node.raw);
      }

      if (node.decimal) {
        return printNumber(node.decimal) + "m";
      }

      const { value } = node;

      if (typeof value === "number") {
        return printNumber(node.raw);
      }

      if (typeof value === "string") {
        const string = printString(node.raw, options);

        return printIndentableString(string);
      }

      return String(value);
    }
  }
}

function printIndentableString(str) {
  if (str?.includes("\n")) {
    const lines = str.split("\n");

    return [join(literalline, lines)];
  }

  return str;
}

function printBigInt(raw) {
  return raw.toLowerCase();
}

function printRegex({ pattern, flags }) {
  flags = [...flags].sort().join("");
  return `/${pattern}/${flags}`;
}

module.exports = {
  printLiteral,
};
