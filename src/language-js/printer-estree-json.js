import { hardline, indent, join } from "../document/builders.js";
import preprocess from "./print-preprocess.js";

async function genericPrint(path, options, print) {
  const node = path.getValue();

  switch (node.type) {
    case "JsonRoot":
      return [await print("node"), hardline];
    case "ArrayExpression": {
      if (node.elements.length === 0) {
        return "[]";
      }

      const printed = await path.map(
        () => (path.getValue() === null ? "null" : print()),
        "elements"
      );

      return [
        "[",
        indent([hardline, join([",", hardline], printed)]),
        hardline,
        "]",
      ];
    }
    case "ObjectExpression":
      return node.properties.length === 0
        ? "{}"
        : [
            "{",
            indent([
              hardline,
              join([",", hardline], await path.map(print, "properties")),
            ]),
            hardline,
            "}",
          ];
    case "ObjectProperty":
      return [await print("key"), ": ", await print("value")];
    case "UnaryExpression":
      return [
        node.operator === "+" ? "" : node.operator,
        await print("argument"),
      ];
    case "NullLiteral":
      return "null";
    case "BooleanLiteral":
      return node.value ? "true" : "false";
    case "StringLiteral":
    case "NumericLiteral":
      return JSON.stringify(node.value);
    case "Identifier": {
      const parent = path.getParentNode();
      if (parent && parent.type === "ObjectProperty" && parent.key === node) {
        return JSON.stringify(node.name);
      }
      return node.name;
    }
    case "TemplateLiteral":
      // There is only one `TemplateElement`
      return print(["quasis", 0]);
    case "TemplateElement":
      return JSON.stringify(node.value.cooked);
    default:
      /* istanbul ignore next */
      throw new Error("unknown type: " + JSON.stringify(node.type));
  }
}

const ignoredProperties = new Set([
  "start",
  "end",
  "extra",
  "loc",
  "comments",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "errors",
  "range",
  "tokens",
]);

function clean(node, newNode /*, parent*/) {
  const { type } = node;
  // We print quoted key
  if (type === "ObjectProperty" && node.key.type === "Identifier") {
    newNode.key = { type: "StringLiteral", value: node.key.name };
    return;
  }
  if (type === "UnaryExpression" && node.operator === "+") {
    return newNode.argument;
  }
  // We print holes in array as `null`
  if (type === "ArrayExpression") {
    for (const [index, element] of node.elements.entries()) {
      if (element === null) {
        newNode.elements.splice(index, 0, { type: "NullLiteral" });
      }
    }
    return;
  }
  // We print `TemplateLiteral` as string
  if (type === "TemplateLiteral") {
    return { type: "StringLiteral", value: node.quasis[0].value.cooked };
  }
}

clean.ignoredProperties = ignoredProperties;

const printer = {
  preprocess,
  print: genericPrint,
  massageAstNode: clean,
};

export default printer;
