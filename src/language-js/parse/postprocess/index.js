import { locStart, locEnd } from "../../loc.js";
import isTypeCastComment from "../../utils/is-type-cast-comment.js";
import isNonEmptyArray from "../../../utils/is-non-empty-array.js";
import isBlockComment from "../../utils/is-block-comment.js";
import isIndentableBlockComment from "../../utils/is-indentable-block-comment.js";
import visitNode from "./visit-node.js";

/**
 * @param {{
 *   text: string,
 *   parser?: string,
 * }} options
 */
function postprocess(ast, options) {
  const { parser, text } = options;

  // `InterpreterDirective` from babel parser
  // Other parsers parse it as comment, babel treat it as comment too
  // https://github.com/babel/babel/issues/15116
  if (ast.type === "File" && ast.program.interpreter) {
    const {
      program: { interpreter },
      comments,
    } = ast;
    delete ast.program.interpreter;
    comments.unshift(interpreter);
  }

  // Keep Babel's non-standard ParenthesizedExpression nodes only if they have Closure-style type cast comments.
  if (parser === "babel") {
    const startOffsetsOfTypeCastedNodes = new Set();

    // Comments might be attached not directly to ParenthesizedExpression but to its ancestor.
    // E.g.: /** @type {Foo} */ (foo).bar();
    // Let's use the fact that those ancestors and ParenthesizedExpression have the same start offset.

    ast = visitNode(ast, (node) => {
      if (node.leadingComments?.some(isTypeCastComment)) {
        startOffsetsOfTypeCastedNodes.add(locStart(node));
      }
    });

    ast = visitNode(ast, (node) => {
      if (node.type === "ParenthesizedExpression") {
        const { expression } = node;

        // Align range with `flow`
        if (expression.type === "TypeCastExpression") {
          expression.range = [...node.range];
          return expression;
        }

        const start = locStart(node);
        if (!startOffsetsOfTypeCastedNodes.has(start)) {
          expression.extra = { ...expression.extra, parenthesized: true };
          return expression;
        }
      }
    });
  }

  ast = visitNode(ast, (node) => {
    switch (node.type) {
      case "LogicalExpression":
        // We remove unneeded parens around same-operator LogicalExpressions
        if (isUnbalancedLogicalTree(node)) {
          return rebalanceLogicalTree(node);
        }
        break;

      // fix unexpected locEnd caused by --no-semi style
      case "VariableDeclaration": {
        const lastDeclaration = node.declarations.at(-1);
        if (lastDeclaration?.init && text[locEnd(lastDeclaration)] !== ";") {
          node.range = [locStart(node), locEnd(lastDeclaration)];
        }
        break;
      }
      // remove redundant TypeScript nodes
      case "TSParenthesizedType":
        return node.typeAnnotation;

      case "TSTypeParameter":
        // babel-ts
        if (typeof node.name === "string") {
          const start = locStart(node);
          node.name = {
            type: "Identifier",
            name: node.name,
            range: [start, start + node.name.length],
          };
        }
        break;

      // For hack-style pipeline
      case "TopicReference":
        ast.extra = { ...ast.extra, __isUsingHackPipeline: true };
        break;

      // In TypeScript, we can't distinguish `with`/`assert`
      case "ImportDeclaration":
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration": {
        // TODO: Remove this when https://github.com/meriyah/meriyah/issues/200 get fixed
        const { exported } = node;
        if (
          parser === "meriyah" &&
          node.type === "ExportAllDeclaration" &&
          exported?.type === "Identifier"
        ) {
          const raw = text.slice(locStart(exported), locEnd(exported));
          if (raw.startsWith('"') || raw.startsWith("'")) {
            node.exported = {
              ...node.exported,
              type: "Literal",
              value: node.exported.name,
              raw,
            };
          }
        }

        if (parser === "typescript" && isNonEmptyArray(node.attributes)) {
          const textBetweenSourceAndAttributes = getTextWithoutComments(
            ast,
            text,
            node.source.range[1],
            node.attributes[0].range[0],
          ).trim();

          if (textBetweenSourceAndAttributes.startsWith("assert")) {
            node.extra = { ...node.extra, deprecatedAssertSyntax: true };
          }
        }
        break;
      }

      // In Flow parser, it doesn't generate union/intersection types for single type
      case "TSUnionType":
      case "TSIntersectionType":
        if (node.types.length === 1) {
          return node.types[0];
        }
        break;
    }
  });

  if (isNonEmptyArray(ast.comments)) {
    let followingComment = ast.comments.at(-1);
    for (let i = ast.comments.length - 2; i >= 0; i--) {
      const comment = ast.comments[i];
      if (
        locEnd(comment) === locStart(followingComment) &&
        isBlockComment(comment) &&
        isBlockComment(followingComment) &&
        isIndentableBlockComment(comment) &&
        isIndentableBlockComment(followingComment)
      ) {
        ast.comments.splice(i + 1, 1);
        comment.value += "*//*" + followingComment.value;
        comment.range = [locStart(comment), locEnd(followingComment)];
      }
      followingComment = comment;
    }
  }

  // In `typescript`/`espree`/`flow`, `Program` doesn't count whitespace and comments
  // See https://github.com/eslint/espree/issues/488
  if (ast.type === "Program") {
    ast.range = [0, text.length];
  }
  return ast;
}

function isUnbalancedLogicalTree(node) {
  return (
    node.type === "LogicalExpression" &&
    node.right.type === "LogicalExpression" &&
    node.operator === node.right.operator
  );
}

function rebalanceLogicalTree(node) {
  if (!isUnbalancedLogicalTree(node)) {
    return node;
  }

  return rebalanceLogicalTree({
    type: "LogicalExpression",
    operator: node.operator,
    left: rebalanceLogicalTree({
      type: "LogicalExpression",
      operator: node.operator,
      left: node.left,
      right: node.right.left,
      range: [locStart(node.left), locEnd(node.right.left)],
    }),
    right: node.right.right,
    range: [locStart(node), locEnd(node)],
  });
}

function getTextWithoutComments(ast, fullText, start, end) {
  const text = fullText.slice(start, end);

  const { comments } = ast;
  if (comments.length === 0) {
    return text;
  }

  const characters = [...text];
  for (const comment of comments) {
    const commentStart = locStart(comment);
    const commentEnd = locEnd(comment);

    if (commentStart >= start && commentEnd <= end) {
      const commentLength = commentEnd - commentStart;
      characters.splice(
        commentStart - start,
        commentLength,
        ..." ".repeat(commentLength),
      );
    }
  }

  return characters.join("");
}

export default postprocess;
