"use strict";

const MESSAGE_ID = "prefer-create-type-check-function";

const isTypeAccess = (node, parameterName) => {
  if (node.type === "ChainExpression") {
    node = node.expression;
  }

  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === parameterName &&
    node.property.type === "Identifier" &&
    node.property.name === "type"
  );
};

const isTypeCheck = (node, parameterName) =>
  node.type === "BinaryExpression" &&
  node.operator === "===" &&
  isTypeAccess(node.left, parameterName) &&
  node.right.type === "Literal" &&
  typeof node.right.value === "string";
function getTypes(node, parameterName) {
  if (isTypeCheck(node, parameterName)) {
    return [node.right.value];
  }

  if (node.type === "LogicalExpression" && node.operator === "||") {
    const left = getTypes(node.left, parameterName);

    if (!left) {
      return;
    }
    const right = getTypes(node.right, parameterName);

    if (!right) {
      return;
    }

    return [...left, ...right];
  }
}

function isTopLevelFunction(node) {
  return (
    node.parent.type === "Program" ||
    (node.parent.type === "VariableDeclarator" &&
      node.parent.parent.type === "VariableDeclaration" &&
      node.parent.parent.parent.type === "Program") ||
    node.parent.type === "ExportDefaultDeclaration"
  );
}

const selector = [
  ":function",
  "[params.length=1]",
  '[params.0.type="Identifier"]',
  "[async!=true]",
  "[generator!=true]",
].join("");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      url: "https://github.com/prettier/prettier/blob/main/scripts/tools/eslint-plugin-prettier-internal-rules/prefer-create-type-check-function.js",
    },
    messages: {
      [MESSAGE_ID]:
        "Prefer use `createTypeCheckFunction` to create this function",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          ignoreSingleType: {
            type: "boolean",
            default: false,
          },
          onlyTopLevelFunctions: {
            type: "boolean",
            default: false,
          },
        },
      },
    ],
    fixable: "code",
  },
  create(context) {
    const { ignoreSingleType, onlyTopLevelFunctions } = {
      ignoreSingleType: false,
      onlyTopLevelFunctions: false,
      ...context.options[0],
    };

    return {
      [selector](functionNode) {
        if (onlyTopLevelFunctions && !isTopLevelFunction(functionNode)) {
          return;
        }

        let returnStatementArgument = functionNode.body;
        if (functionNode.body.type === "BlockStatement") {
          const { body } = functionNode;
          if (
            body.body.length !== 1 ||
            body.body[0].type !== "ReturnStatement" ||
            !body.body[0].argument
          ) {
            return;
          }
          returnStatementArgument = body.body[0].argument;
        }

        const parameterName = functionNode.params[0].name;
        const types = getTypes(returnStatementArgument, parameterName);
        if (!types) {
          return;
        }

        if (ignoreSingleType && types.length === 1) {
          return;
        }

        const problem = {
          node: functionNode,
          messageId: MESSAGE_ID,
        };

        if (
          context.getSourceCode().getCommentsInside(functionNode).length === 0
        ) {
          problem.fix = (fixer) => {
            let text = `createTypeCheckFunction(${JSON.stringify(
              types,
              undefined,
              2
            )})`;
            if (functionNode.type === "FunctionDeclaration") {
              const functionName =
                functionNode.id?.name ?? "__please_name_this_function";
              text = `const ${functionName} = ${text};`;

              if (
                functionNode.parent.type === "ExportDefaultDeclaration" &&
                functionNode.parent.declaration === functionNode
              ) {
                return fixer.replaceText(
                  functionNode.parent,
                  `${text}\nexport default ${functionName};`
                );
              }
            }

            return fixer.replaceText(functionNode, text);
          };
        }

        context.report(problem);
      },
    };
  },
};
