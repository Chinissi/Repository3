"use strict";

const createError = require("../common/parser-create-error");
const postprocess = require("./postprocess");

function parse(text, parsers, options) {
  const { preprocess: glimmer, traverse } = require("@glimmer/syntax");
  let ast;
  try {
    ast = glimmer(text, { mode: "codemod" });
  } catch (error) {
    const matches = error.message.match(/on line (\d+)/);
    /* istanbul ignore else */
    if (matches) {
      throw createError(error.message, {
        start: { line: Number(matches[1]), column: 0 },
      });
    } else {
      throw error;
    }
  }

  return postprocess(ast, options, traverse);
}

module.exports = {
  parsers: {
    glimmer: {
      parse,
      astFormat: "glimmer",
      // TODO: `locStart` and `locEnd` should return a number offset
      // https://prettier.io/docs/en/plugins.html#parsers
      // but we need access to the original text to use
      // `loc.start` and `loc.end` objects to calculate the offset
      /* istanbul ignore next */
      locStart(node) {
        return node.loc && node.loc.start;
      },
      /* istanbul ignore next */
      locEnd(node) {
        return node.loc && node.loc.end;
      },
    },
  },
};
