import { formatAttributeValue, shouldHugJsExpression } from "./utils.js";

async function printAngularControlFlowBlockParameters(
  textToDoc,
  print,
  path,
  /* options,*/
) {
  const { node } = path;
  const code = node.parameters.map(({ expression }) => expression).join("; ");

  const doc = await formatAttributeValue(
    code,
    textToDoc,
    {
      parser: "__ng_directive",
      __isInHtmlAttribute: false,
      trailingComma: "none",
    },
    shouldHugJsExpression,
  );

  // We have to put the doc on the node, since `node.parameters` is not a valid "node"
  node.__embed_parameters_doc = doc;
}

export default printAngularControlFlowBlockParameters;
