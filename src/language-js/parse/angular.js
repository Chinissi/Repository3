import { locStart, locEnd } from "../loc.js";

let ngEstreeParser;
function createParser(_parse) {
  return {
    astFormat: "estree",
    async parse(text, parsers, options) {
      ngEstreeParser ??= await import("angular-estree-parser");
      const node = _parse(text, ngEstreeParser);
      return {
        type: "NGRoot",
        node:
          options.parser === "__ng_action" &&
          node.type !== "NGChainedExpression"
            ? { ...node, type: "NGChainedExpression", expressions: [node] }
            : node,
      };
    },
    locStart,
    locEnd,
  };
}

const parser = {
  parsers: {
    __ng_action: createParser((text, ng) => ng.parseAction(text)),
    __ng_binding: createParser((text, ng) => ng.parseBinding(text)),
    __ng_interpolation: createParser((text, ng) => ng.parseInterpolation(text)),
    __ng_directive: createParser((text, ng) => ng.parseTemplateBindings(text)),
  },
};

export default parser;
