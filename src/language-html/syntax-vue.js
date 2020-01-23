"use strict";

const {
  builders: { concat, group }
} = require("../document");

/**
 *     v-for="... in ..."
 *     v-for="... of ..."
 *     v-for="(..., ...) in ..."
 *     v-for="(..., ...) of ..."
 */
function printVueFor(value, textToDoc) {
  const { left, operator, right } = parseVueFor(value);
  return concat([
    group(
      textToDoc(`function _(${left}) {}`, {
        parser: "babel",
        __isVueForBindingLeft: true
      })
    ),
    " ",
    operator,
    " ",
    textToDoc(right, { parser: "__js_expression" })
  ]);
}

// modified from https://github.com/vuejs/vue/blob/v2.5.17/src/compiler/parser/index.js#L370-L387
function parseVueFor(value) {
  const forAliasRE = /([^]*?)\s+(in|of)\s+([^]*)/;
  const forIteratorRE = /,([^,}\]]*)(?:,([^,}\]]*))?$/;
  const stripParensRE = /^\(|\)$/g;

  const inMatch = value.match(forAliasRE);
  if (!inMatch) {
    return;
  }
  const res = {};
  res.for = inMatch[3].trim();
  const alias = inMatch[1].trim().replace(stripParensRE, "");
  const iteratorMatch = alias.match(forIteratorRE);
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, "");
    res.iterator1 = iteratorMatch[1].trim();
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim();
    }
  } else {
    res.alias = alias;
  }

  return {
    left: `${[res.alias, res.iterator1, res.iterator2]
      .filter(Boolean)
      .join(",")}`,
    operator: inMatch[2],
    right: res.for
  };
}

function printVueSlotScope(value, textToDoc) {
  return textToDoc(`function _(${value}) {}`, {
    parser: "babel",
    __isVueSlotScope: true
  });
}

function isVueEventBindingExpression(eventBindingValue) {
  // https://github.com/vuejs/vue/blob/v2.5.17/src/compiler/codegen/events.js#L3-L4
  // arrow function or anonymous function
  const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/;
  // simple member expression chain (a, a.b, a['b'], a["b"], a[0], a[b])
  const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

  // https://github.com/vuejs/vue/blob/v2.5.17/src/compiler/helpers.js#L104
  const value = eventBindingValue.trim();

  return fnExpRE.test(value) || simplePathRE.test(value);
}

module.exports = {
  isVueEventBindingExpression,
  printVueFor,
  printVueSlotScope
};
