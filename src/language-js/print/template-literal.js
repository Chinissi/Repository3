import { getStringWidth, getIndentSize } from "../../common/util.js";
import {
  join,
  hardline,
  softline,
  group,
  indent,
  align,
  lineSuffixBoundary,
  addAlignmentToDoc,
  label,
} from "../../document/builders.js";
import { printDocToString } from "../../document/printer.js";
import { mapDoc } from "../../document/utils.js";
import {
  isBinaryish,
  isJestEachTemplateLiteral,
  isSimpleTemplateLiteral,
  hasComment,
  isMemberExpression,
} from "../utils/index.js";

function printTemplateLiteral(path, print, options) {
  const { node } = path;
  const isTemplateLiteral = node.type === "TemplateLiteral";

  if (
    isTemplateLiteral &&
    isJestEachTemplateLiteral(node, path.getParentNode())
  ) {
    const printed = printJestEachTemplateLiteral(path, options, print);
    if (printed) {
      return printed;
    }
  }
  let expressionsKey = "expressions";
  if (node.type === "TSTemplateLiteralType") {
    expressionsKey = "types";
  }
  const parts = [];

  let expressions = path.map(print, expressionsKey);
  const isSimple = isSimpleTemplateLiteral(node);

  if (isSimple) {
    expressions = expressions.map(
      (doc) =>
        printDocToString(doc, {
          ...options,
          printWidth: Number.POSITIVE_INFINITY,
        }).formatted
    );
  }

  parts.push(lineSuffixBoundary, "`");

  let previousQuasiIndentSize = 0;
  path.each((childPath) => {
    const i = childPath.getName();

    parts.push(print());

    if (i < expressions.length) {
      // For a template literal of the following form:
      //   `someQuery {
      //     ${call({
      //       a,
      //       b,
      //     })}
      //   }`
      // the expression is on its own line (there is a \n in the previous
      // quasi literal), therefore we want to indent the JavaScript
      // expression inside at the beginning of ${ instead of the beginning
      // of the `.
      const { tabWidth } = options;
      const quasi = childPath.node;
      const text = quasi.value.raw;
      let indentSize = getIndentSize(text, tabWidth);
      if (indentSize === 0 && !text.includes("\n")) {
        indentSize = previousQuasiIndentSize;
      }
      previousQuasiIndentSize = indentSize;

      let printed = expressions[i];

      if (!isSimple) {
        const expression = node[expressionsKey][i];
        // Breaks at the template element boundaries (${ and }) are preferred to breaking
        // in the middle of a MemberExpression
        if (
          hasComment(expression) ||
          isMemberExpression(expression) ||
          expression.type === "ConditionalExpression" ||
          expression.type === "SequenceExpression" ||
          expression.type === "TSAsExpression" ||
          isBinaryish(expression)
        ) {
          printed = [indent([softline, printed]), softline];
        }
      }

      const aligned =
        indentSize === 0 && text.endsWith("\n")
          ? align(Number.NEGATIVE_INFINITY, printed)
          : addAlignmentToDoc(printed, indentSize, tabWidth);

      parts.push(group(["${", aligned, lineSuffixBoundary, "}"]));
    }
  }, "quasis");

  parts.push("`");

  return parts;
}

function printTaggedTemplateLiteral(print) {
  const quasiDoc = print("quasi");
  return label(quasiDoc.label && { tagged: true, ...quasiDoc.label }, [
    print("tag"),
    print("typeParameters"),
    lineSuffixBoundary,
    quasiDoc,
  ]);
}

function printJestEachTemplateLiteral(path, options, print) {
  /**
   * a    | b    | expected
   * ${1} | ${1} | ${2}
   * ${1} | ${2} | ${3}
   * ${2} | ${1} | ${3}
   */
  const { node } = path;
  const headerNames = node.quasis[0].value.raw.trim().split(/\s*\|\s*/);
  if (
    headerNames.length > 1 ||
    headerNames.some((headerName) => headerName.length > 0)
  ) {
    options.__inJestEach = true;
    const expressions = path.map(print, "expressions");
    options.__inJestEach = false;
    const parts = [];
    const stringifiedExpressions = expressions.map(
      (doc) =>
        "${" +
        printDocToString(doc, {
          ...options,
          printWidth: Number.POSITIVE_INFINITY,
          endOfLine: "lf",
        }).formatted +
        "}"
    );

    const tableBody = [{ hasLineBreak: false, cells: [] }];
    for (let i = 1; i < node.quasis.length; i++) {
      const row = tableBody.at(-1);
      const correspondingExpression = stringifiedExpressions[i - 1];

      row.cells.push(correspondingExpression);
      if (correspondingExpression.includes("\n")) {
        row.hasLineBreak = true;
      }

      if (node.quasis[i].value.raw.includes("\n")) {
        tableBody.push({ hasLineBreak: false, cells: [] });
      }
    }

    const maxColumnCount = Math.max(
      headerNames.length,
      ...tableBody.map((row) => row.cells.length)
    );

    const maxColumnWidths = Array.from({ length: maxColumnCount }).fill(0);
    const table = [
      { cells: headerNames },
      ...tableBody.filter((row) => row.cells.length > 0),
    ];
    for (const { cells } of table.filter((row) => !row.hasLineBreak)) {
      for (const [index, cell] of cells.entries()) {
        maxColumnWidths[index] = Math.max(
          maxColumnWidths[index],
          getStringWidth(cell)
        );
      }
    }

    parts.push(
      lineSuffixBoundary,
      "`",
      indent([
        hardline,
        join(
          hardline,
          table.map((row) =>
            join(
              " | ",
              row.cells.map((cell, index) =>
                row.hasLineBreak
                  ? cell
                  : cell +
                    " ".repeat(maxColumnWidths[index] - getStringWidth(cell))
              )
            )
          )
        ),
      ]),
      hardline,
      "`"
    );
    return parts;
  }
}

function printTemplateExpression(path, print) {
  const { node } = path;
  let printed = print();
  if (hasComment(node)) {
    printed = group([indent([softline, printed]), softline]);
  }
  return ["${", printed, lineSuffixBoundary, "}"];
}

function printTemplateExpressions(path, print) {
  return path.map(
    (path) => printTemplateExpression(path, print),
    "expressions"
  );
}

function escapeTemplateCharacters(doc, raw) {
  return mapDoc(doc, (currentDoc) => {
    if (typeof currentDoc === "string") {
      return raw
        ? currentDoc.replace(/(\\*)`/g, "$1$1\\`")
        : uncookTemplateElementValue(currentDoc);
    }

    return currentDoc;
  });
}

function uncookTemplateElementValue(cookedValue) {
  return cookedValue.replace(/([\\`]|\${)/g, "\\$1");
}

export {
  printTemplateLiteral,
  printTaggedTemplateLiteral,
  printTemplateExpressions,
  escapeTemplateCharacters,
  uncookTemplateElementValue,
};
