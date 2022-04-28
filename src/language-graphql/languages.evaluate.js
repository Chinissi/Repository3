import linguistLanguages from "linguist-languages";
import createLanguage from "../utils/create-language.js";

const languages = [
  createLanguage(linguistLanguages.Handlebars, () => ({
    since: "2.3.0",
    parsers: ["glimmer"],
    vscodeLanguageIds: ["handlebars"],
  })),
];

export default languages;
