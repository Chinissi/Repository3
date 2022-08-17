import { VISITOR_KEYS as babelVisitorKeys } from "@babel/types";
import { visitorKeys as tsVisitorKeys } from "@typescript-eslint/visitor-keys";
import unionVisitorKeys from "./union-visitor-keys.js";

const angularVisitorKeys = {
  NGRoot: ["node"],
  NGPipeExpression: ["left", "right", "arguments"],
  NGChainedExpression: ["expressions"],
  NGEmptyExpression: [],
  NGQuotedExpression: [],
  NGMicrosyntax: ["body"],
  NGMicrosyntaxKey: [],
  NGMicrosyntaxExpression: ["expression", "alias"],
  NGMicrosyntaxKeyedExpression: ["key", "expression"],
  NGMicrosyntaxLet: ["key", "value"],
  NGMicrosyntaxAs: ["key", "alias"],
};

const additionalVisitorKeys = {
  // Prettier
  JsExpressionRoot: ["node"],
  JsonRoot: ["node"],

  // Babel missing this
  Program: ["interpreter"],

  // Legacy node type
  SpreadProperty: ["argument"],

  // typescript
  TSJSDocAllType: [],
  TSJSDocUnknownType: [],
  TSJSDocNullableType: ["typeAnnotation"],
  TSJSDocNonNullableType: ["typeAnnotation"],
  // This one maybe invalid, need investigate
  TSAbstractMethodDefinition: ["decorators"],
  TSModuleDeclaration: ["modifiers"],
  TSEnumDeclaration: ["modifiers"],

  // flow
  QualifiedTypeofIdentifier: ["id", "qualification"],
  BigIntLiteralTypeAnnotation: [],
  BigIntTypeAnnotation: [],
  FunctionTypeAnnotation: ["this"],
  PropertyDefinition: ["variance"],
  ArrowFunctionExpression: ["predicate"],
  DeclareFunction: ["predicate"],
  FunctionDeclaration: ["predicate"],
  ClassProperty: ["variance"],
  ClassPrivateProperty: ["variance"],
  EnumBooleanMember: ["init"],

  Property: ["decorators"],
};

export default unionVisitorKeys([
  babelVisitorKeys,
  tsVisitorKeys,
  angularVisitorKeys,
  additionalVisitorKeys,
]);
