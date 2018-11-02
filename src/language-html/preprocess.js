"use strict";

const {
  canHaveInterpolation,
  getNodeCssStyleDisplay,
  isDanglingSpaceSensitiveNode,
  isIndentationSensitiveNode,
  isLeadingSpaceSensitiveNode,
  isTrailingSpaceSensitiveNode,
  isWhitespaceSensitiveNode
} = require("./utils");

const PREPROCESS_PIPELINE = [
  removeIgnorableFirstLf,
  mergeCdataIntoText,
  extractInterpolation,
  addIsSelfClosing,
  extractWhitespaces,
  addCssDisplay,
  addIsSpaceSensitive
];

function preprocess(ast, options) {
  for (const fn of PREPROCESS_PIPELINE) {
    ast = fn(ast, options);
  }
  return ast;
}

function removeIgnorableFirstLf(ast /*, options */) {
  return ast.map(node => {
    if (
      node.type === "element" &&
      node.tagDefinition.ignoreFirstLf &&
      node.children.length !== 0 &&
      node.children[0].type === "text" &&
      node.children[0].value[0] === "\n"
    ) {
      const text = node.children[0];
      return node.clone({
        children:
          text.value.length === 1
            ? node.children.slice(1)
            : [].concat(
                text.clone({ value: text.value.slice(1) }),
                node.children.slice(1)
              )
      });
    }
    return node;
  });
}

function mergeCdataIntoText(ast /*, options */) {
  return ast.map(node => {
    if (node.children && node.children.some(child => child.type === "cdata")) {
      const newChildren = [];
      for (const child of node.children) {
        if (child.type !== "text" && child.type !== "cdata") {
          newChildren.push(child);
          continue;
        }

        const newChild =
          child.type === "text"
            ? child
            : child.clone({
                type: "text",
                value: `<![CDATA[${child.value}]]>`
              });

        if (
          newChildren.length === 0 ||
          newChildren[newChildren.length - 1].type !== "text"
        ) {
          newChildren.push(newChild);
          continue;
        }

        const lastChild = newChildren.pop();
        const ParseSourceSpan = lastChild.sourceSpan.constructor;
        newChildren.push(
          lastChild.clone({
            value: lastChild.value + newChild.value,
            sourceSpan: new ParseSourceSpan(
              lastChild.sourceSpan.start,
              newChild.sourceSpan.end
            )
          })
        );
      }
      return node.clone({ children: newChildren });
    }

    return node;
  });
}

function extractInterpolation(ast, options) {
  if (options.parser === "html") {
    return ast;
  }

  const interpolationRegex = /\{\{([\s\S]+?)\}\}/g;
  return ast.map(node => {
    if (!canHaveInterpolation(node)) {
      return node;
    }

    const newChildren = [];

    for (const child of node.children) {
      if (child.type !== "text") {
        newChildren.push(child);
        continue;
      }

      const ParseSourceSpan = child.sourceSpan.constructor;

      let startSourceSpan = child.sourceSpan.start;
      let endSourceSpan = null;
      const components = child.value.split(interpolationRegex);
      for (
        let i = 0;
        i < components.length;
        i++, startSourceSpan = endSourceSpan
      ) {
        const value = components[i];

        if (i % 2 === 0) {
          endSourceSpan = startSourceSpan.moveBy(value.length);
          if (value.length !== 0) {
            newChildren.push({
              type: "text",
              value,
              sourceSpan: new ParseSourceSpan(startSourceSpan, endSourceSpan)
            });
          }
          continue;
        }

        endSourceSpan = startSourceSpan.moveBy(value.length + 4); // `{{` + `}}`
        newChildren.push({
          type: "interpolation",
          sourceSpan: new ParseSourceSpan(startSourceSpan, endSourceSpan),
          children:
            value.length === 0
              ? []
              : [
                  {
                    type: "text",
                    value,
                    sourceSpan: new ParseSourceSpan(
                      startSourceSpan.moveBy(2),
                      endSourceSpan.moveBy(-2)
                    )
                  }
                ]
        });
      }
    }

    return node.clone({ children: newChildren });
  });
}

/** add `isSelfClosing` for void tags, directives, and comments */
function addIsSelfClosing(ast /*, options */) {
  return ast.map(node => {
    if (
      !node.children ||
      (node.type === "element" &&
        (node.tagDefinition.isVoid ||
          // self-closing
          node.startSourceSpan === node.endSourceSpan))
    ) {
      return node.clone({ isSelfClosing: true });
    }
    return node;
  });
}

/**
 * - add `hasLeadingSpaces` field
 * - add `hasTrailingSpaces` field
 * - add `hasDanglingSpaces` field for parent nodes
 * - add `isWhitespaceSensitive`, `isIndentationSensitive` field for text nodes
 * - remove insensitive whitespaces
 */
function extractWhitespaces(ast /*, options*/) {
  const TYPE_WHITESPACE = "whitespace";
  return ast.map(node => {
    if (!node.children) {
      return node;
    }

    if (
      node.children.length === 0 ||
      (node.children.length === 1 &&
        node.children[0].type === "text" &&
        node.children[0].value.trim().length === 0)
    ) {
      return node.clone({
        children: [],
        hasDanglingSpaces: node.children.length !== 0
      });
    }

    const isWhitespaceSensitive = isWhitespaceSensitiveNode(node);
    const isIndentationSensitive = isIndentationSensitiveNode(node);

    return node.clone({
      children: node.children
        // extract whitespace nodes
        .reduce((newChildren, child) => {
          if (child.type !== "text") {
            return newChildren.concat(child);
          }

          if (isWhitespaceSensitive) {
            return newChildren.concat(
              Object.assign({}, child, {
                isWhitespaceSensitive,
                isIndentationSensitive
              })
            );
          }

          const localChildren = [];

          const [, leadingSpaces, text, trailingSpaces] = child.value.match(
            /^(\s*)([\s\S]*?)(\s*)$/
          );

          if (leadingSpaces) {
            localChildren.push({ type: TYPE_WHITESPACE });
          }

          const ParseSourceSpan = child.sourceSpan.constructor;

          if (text) {
            localChildren.push({
              type: "text",
              value: text,
              sourceSpan: new ParseSourceSpan(
                child.sourceSpan.start.moveBy(leadingSpaces.length),
                child.sourceSpan.end.moveBy(-trailingSpaces.length)
              )
            });
          }

          if (trailingSpaces) {
            localChildren.push({ type: TYPE_WHITESPACE });
          }

          return newChildren.concat(localChildren);
        }, [])
        // set hasLeadingSpaces/hasTrailingSpaces and filter whitespace nodes
        .reduce((newChildren, child, i, children) => {
          if (child.type === TYPE_WHITESPACE) {
            return newChildren;
          }

          const hasLeadingSpaces =
            i !== 0 && children[i - 1].type === TYPE_WHITESPACE;
          const hasTrailingSpaces =
            i !== children.length - 1 &&
            children[i + 1].type === TYPE_WHITESPACE;

          return newChildren.concat(
            Object.assign({}, child, {
              hasLeadingSpaces,
              hasTrailingSpaces
            })
          );
        }, [])
    });
  });
}

function addCssDisplay(ast, options) {
  return ast.map(node =>
    node.clone({ cssDisplay: getNodeCssStyleDisplay(node, options) })
  );
}

/**
 * - add `isLeadingSpaceSensitive` field
 * - add `isTrailingSpaceSensitive` field
 * - add `isDanglingSpaceSensitive` field for parent nodes
 */
function addIsSpaceSensitive(ast /*, options */) {
  return ast.map(node => {
    if (!node.children) {
      return node;
    }

    if (node.children.length === 0) {
      return node.clone({
        isDanglingSpaceSensitive: isDanglingSpaceSensitiveNode(node)
      });
    }

    return node.clone({
      children: node.children
        .map(child => {
          return Object.assign({}, child, {
            isLeadingSpaceSensitive: isLeadingSpaceSensitiveNode(child),
            isTrailingSpaceSensitive: isTrailingSpaceSensitiveNode(child)
          });
        })
        .map((child, index, children) =>
          Object.assign({}, child, {
            isLeadingSpaceSensitive:
              index === 0
                ? child.isLeadingSpaceSensitive
                : children[index - 1].isTrailingSpaceSensitive &&
                  child.isLeadingSpaceSensitive,
            isTrailingSpaceSensitive:
              index === children.length - 1
                ? child.isTrailingSpaceSensitive
                : children[index + 1].isLeadingSpaceSensitive &&
                  child.isTrailingSpaceSensitive
          })
        )
    });
  });
}

module.exports = preprocess;
