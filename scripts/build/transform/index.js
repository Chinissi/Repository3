import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { traverseFast as traverse } from "@babel/types";
import babelGenerator from "@babel/generator";
import { outdent } from "outdent";
import { SOURCE_DIR } from "../../utils/index.mjs";

const generate = babelGenerator.default;
const atHelperPath = fileURLToPath(new URL("../shims/at.js", import.meta.url));

/* Doesn't work for dependencies, optional call, computed property, and spread arguments */

/**
 * `Object.hasOwn(foo, "bar")` -> `Object.prototype.hasOwnProperty.call(foo, "bar")`
 *
 * @param {import("@babel/types").Node} node
 * @returns {boolean}
 */
function transformObjectHasOwnCall(node) {
  if (
    !(
      node.type === "CallExpression" &&
      !node.optional &&
      node.arguments.length === 2 &&
      node.arguments.every(({ type }) => type !== "SpreadElement") &&
      node.callee.type === "MemberExpression" &&
      !node.callee.optional &&
      !node.callee.computed &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === "Object" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "hasOwn"
    )
  ) {
    return false;
  }

  node.callee = {
    type: "MemberExpression",
    object: {
      type: "MemberExpression",
      object: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "Object" },
        property: { type: "Identifier", name: "prototype" },
      },
      property: { type: "Identifier", name: "hasOwnProperty" },
    },
    property: { type: "Identifier", name: "call" },
  };

  return true;
}

/**
 * `foo.at(index)` -> `__at(false, foo, index)`
 * `foo?.at(index)` -> `__at(true, foo, index)`
 *
 * @param {import("@babel/types").Node} node
 * @returns {boolean}
 */
function transformMethodCall({ node, method, replacement = `__${method}` }) {
  if (
    !(
      (node.type === "CallExpression" ||
        node.type === "OptionalCallExpression") &&
      !node.optional &&
      node.arguments.length === 1 &&
      node.arguments.every(({ type }) => type !== "SpreadElement") &&
      (node.callee.type === "MemberExpression" ||
        node.callee.type === "OptionalMemberExpression") &&
      !node.callee.computed &&
      node.callee.object.type !== "ThisExpression" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === method
    )
  ) {
    return false;
  }

  // `__at({object, isOptionalObject, arguments})`
  node.arguments = [
    {
      type: "ObjectExpression",
      properties: [
        {
          type: "ObjectProperty",
          key: { type: "Identifier", name: "object" },
          value: node.callee.object,
        },
        {
          type: "ObjectProperty",
          key: { type: "Identifier", name: "isOptionalObject" },
          value: {
            type: "BooleanLiteral",
            value: node.callee.type === "OptionalMemberExpression",
          },
        },
        {
          type: "ObjectProperty",
          key: { type: "Identifier", name: "arguments" },
          value: {
            type: "ArrayExpression",
            elements: node.arguments,
          },
        },
      ],
    },
  ];
  node.callee = { type: "Identifier", name: replacement };

  return true;
}

function transform(original, file) {
  if (
    file === atHelperPath ||
    !file.startsWith(SOURCE_DIR) ||
    (!original.includes(".at(") && !original.includes("Object.hasOwn("))
  ) {
    return original;
  }

  let changed = false;
  let shouldInjectRelativeIndexingHelper = false;
  const ast = parse(original, { sourceType: "module" });
  traverse(ast, (node) => {
    const hasObjectHasOwnCall = transformObjectHasOwnCall(node);

    const hasRelativeIndexingCall = transformMethodCall({
      node,
      method: "at",
    });
    shouldInjectRelativeIndexingHelper ||= hasRelativeIndexingCall;

    changed ||= hasObjectHasOwnCall || hasRelativeIndexingCall;
  });

  if (!changed) {
    return original;
  }

  let { code } = generate(ast);

  if (shouldInjectRelativeIndexingHelper) {
    code = outdent`
      import __at from ${JSON.stringify(atHelperPath)};

      ${code}
    `;
  }

  return code;
}

export default transform;
