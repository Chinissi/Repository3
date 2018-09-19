"use strict";

const htmlTagNames = require("html-tag-names");
const nonFragmentRegex = /^\s*(<!--[\s\S]*?-->\s*)*<(!doctype|html|head|body)[\s>]/i;

function parse(text /*, parsers, opts*/) {
  // Inline the require to avoid loading all the JS if we don't use it
  const parse5 = require("parse5");
  const htmlparser2TreeAdapter = require("parse5-htmlparser2-tree-adapter");

  const isFragment = !nonFragmentRegex.test(text);
  const ast = (isFragment ? parse5.parseFragment : parse5.parse)(text, {
    treeAdapter: htmlparser2TreeAdapter,
    sourceCodeLocationInfo: true
  });

  return normalize(ast, text);
}

function normalize(node, text) {
  delete node.parent;
  delete node.next;
  delete node.prev;

  // preserve case-sensitive tag names
  if (
    node.type === "tag" &&
    node.sourceCodeLocation &&
    htmlTagNames.indexOf(node.name) === -1
  ) {
    node.name = text.slice(
      node.sourceCodeLocation.startOffset + 1, // <
      node.sourceCodeLocation.startOffset + 1 + node.name.length
    );
  }

  if (node.attribs) {
    node.attributes = Object.keys(node.attribs).map(attributeKey => {
      return {
        type: "attribute",
        key: attributeKey,
        value: node.attribs[attributeKey]
      };
    });
  }

  if (node.children) {
    node.children = node.children.map(child => normalize(child, text));
  }

  return node;
}

module.exports = {
  parsers: {
    parse5: {
      parse,
      astFormat: "htmlparser2",
      locStart(node) {
        return node.sourceCodeLocation && node.sourceCodeLocation.startOffset;
      },
      locEnd(node) {
        return node.sourceCodeLocation && node.sourceCodeLocation.endOffset;
      }
    }
  }
};
