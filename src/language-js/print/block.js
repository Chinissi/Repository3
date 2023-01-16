import { printDanglingComments } from "../../main/comments.js";
import { isNonEmptyArray } from "../../common/util.js";
import { hardline, indent } from "../../document/builders.js";
import {
  hasComment,
  CommentCheckFlags,
  isNextLineEmpty,
} from "../utils/index.js";
import { printHardlineAfterHeritage } from "./class.js";

import { printBody } from "./statement.js";

/** @typedef {import("../../document/builders.js").Doc} Doc */

function printBlock(path, options, print) {
  const { node } = path;
  const parts = [];

  if (node.type === "StaticBlock") {
    parts.push("static ");
  }

  if (node.type === "ClassBody" && isNonEmptyArray(node.body)) {
    const { parent } = path;
    parts.push(printHardlineAfterHeritage(parent));
  }

  parts.push("{");
  const printed = printBlockBody(path, options, print);
  if (printed) {
    parts.push(indent([hardline, printed]), hardline);
  } else {
    const { parent } = path;
    const parentParent = path.grandparent;
    if (
      !(
        parent.type === "ArrowFunctionExpression" ||
        parent.type === "FunctionExpression" ||
        parent.type === "FunctionDeclaration" ||
        parent.type === "ObjectMethod" ||
        parent.type === "ClassMethod" ||
        parent.type === "ClassPrivateMethod" ||
        parent.type === "ForStatement" ||
        parent.type === "WhileStatement" ||
        parent.type === "DoWhileStatement" ||
        parent.type === "DoExpression" ||
        (parent.type === "CatchClause" && !parentParent.finalizer) ||
        parent.type === "TSModuleDeclaration" ||
        parent.type === "TSDeclareFunction" ||
        node.type === "StaticBlock" ||
        node.type === "ClassBody" ||
        node.type === "TSInterfaceBody"
      )
    ) {
      parts.push(hardline);
    }
  }

  parts.push("}");

  return parts;
}

function printBlockBody(path, options, print) {
  const { node } = path;

  const nodeHasDirectives = isNonEmptyArray(node.directives);
  const nodeHasBody = node.body.some((node) => node.type !== "EmptyStatement");
  const nodeHasComment = hasComment(node, CommentCheckFlags.Dangling);

  if (!nodeHasDirectives && !nodeHasBody && !nodeHasComment) {
    return "";
  }

  const parts = [];
  // Babel 6
  if (nodeHasDirectives) {
    path.each(({ node, isLast }) => {
      parts.push(print());
      if (!isLast || nodeHasBody || nodeHasComment) {
        parts.push(hardline);
        if (isNextLineEmpty(node, options)) {
          parts.push(hardline);
        }
      }
    }, "directives");
  }

  if (nodeHasBody) {
    parts.push(printBody(path, options, print));
  }

  if (nodeHasComment) {
    parts.push(printDanglingComments(path, options, /* sameIndent */ true));
  }

  if (node.type === "Program") {
    const { parent } = path;
    if (!parent || parent.type !== "ModuleExpression") {
      parts.push(hardline);
    }
  }

  return parts;
}

export { printBlock, printBlockBody };
