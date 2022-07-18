"use strict";

module.exports = {
  languages: [
    {
      name: "foo",
      parsers: ["foo-parser"],
      extensions: [".foo"]
    }
  ],
  parsers: {
    "foo-parser": {
      parse: text => ({ text }),
      astFormat: "foo-ast"
    }
  },
  printers: {
    "foo-ast": {
      async print( path ) {

        const prettier = await import("../../../config/prettier-entry.js")
const { lineSuffix } = prettier.doc.builders;
return lineSuffix(path.getValue().text.trim())
}
    }
  }
};
