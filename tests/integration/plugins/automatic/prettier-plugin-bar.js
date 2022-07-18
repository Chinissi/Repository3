"use strict";

module.exports = {
  languages: [
    {
      name: "bar",
      parsers: ["bar"]
    }
  ],
  parsers: {
    bar: {
      parse: text => ({ text }),
      astFormat: "bar"
    }
  },
  printers: {
    bar: {
      async print(path) {
        const prettier = await import("../../../config/prettier-entry.js")
const { concat } = prettier.doc.builders;

        return  concat([
          "content from `prettier-plugin-bar.js` file + ",
          path.getValue().text
        ])
}
    }
  },
  defaultOptions: {
    tabWidth: 4
  }
};
