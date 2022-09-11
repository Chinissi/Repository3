import { join, hardline } from "../../document/builders.js";
import { replaceEndOfLine } from "../../document/utils.js";

import { isLineComment } from "../utils/index.js";
import { locStart, locEnd } from "../loc.js";
import isBlockComment from "../utils/is-block-comment.js";

function printComment(commentPath, options) {
  const comment = commentPath.node;

  if (isLineComment(comment)) {
    // Supports `//`, `#!`, `<!--`, and `-->`
    return options.originalText
      .slice(locStart(comment), locEnd(comment))
      .trimEnd();
  }

  if (isBlockComment(comment)) {
    if (isIndentableBlockComment(comment)) {
      return printIndentableBlockComment(comment);
    }

    const commentEnd = locEnd(comment);
    const isInsideFlowComment =
      options.originalText.slice(commentEnd - 3, commentEnd) === "*-/";
    return [
      "/*",
      replaceEndOfLine(comment.value),
      isInsideFlowComment ? "*-/" : "*/",
    ];
  }

  /* istanbul ignore next */
  throw new Error("Not a comment: " + JSON.stringify(comment));
}

function isIndentableBlockComment(comment) {
  // If the comment has multiple lines and every line starts with a star
  // we can fix the indentation of each line. The stars in the `/*` and
  // `*/` delimiters are not included in the comment value, so add them
  // back first.
  const lines = `*${comment.value}*`.split("\n");
  return lines.length > 1 && lines.every((line) => line.trim()[0] === "*");
}

function printIndentableBlockComment(comment) {
  const lines = comment.value.split("\n");

  return [
    "/*",
    join(
      hardline,
      lines.map((line, index) =>
        index === 0
          ? line.trimEnd()
          : " " + (index < lines.length - 1 ? line.trim() : line.trimStart())
      )
    ),
    "*/",
  ];
}

export { printComment };
