"use strict";

const util = require("./util");
const { mapDoc } = require("../doc").utils;

function isNextLineEmpty(text, node, options) {
  return util.isNextLineEmpty(text, node, options.locEnd);
}

function getNextNonSpaceNonCommentCharacterIndex(text, node, options) {
  return util.getNextNonSpaceNonCommentCharacterIndex(
    text,
    node,
    options.locEnd
  );
}

module.exports = {
  isNextLineEmpty,
  isNextLineEmptyAfterIndex: util.isNextLineEmptyAfterIndex,
  getNextNonSpaceNonCommentCharacterIndex,
  mapDoc, // TODO: remove in 2.0, we already exposed it in docUtils
  makeString: util.makeString,
  addLeadingComment: util.addLeadingComment,
  addDanglingComment: util.addDanglingComment,
  addTrailingComment: util.addTrailingComment
};
