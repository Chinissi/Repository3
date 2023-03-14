import { VISITOR_KEYS as babelVisitorKeys } from "@babel/types";
import { visitorKeys as tsVisitorKeys } from "@typescript-eslint/visitor-keys";
import flowVisitorKeys from "hermes-eslint/dist/HermesESLintVisitorKeys.js";
import unionVisitorKeys from "./union-visitor-keys.js";

const angularVisitorKeys = {
  NGRoot: ["node"],
  NGPipeExpression: ["left", "right", "arguments"],
  NGChainedExpression: ["expressions"],
  NGEmptyExpression: [],
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

  // TypeScript
  TSJSDocAllType: [],
  TSJSDocUnknownType: [],
  TSJSDocNullableType: ["typeAnnotation"],
  TSJSDocNonNullableType: ["typeAnnotation"],
  // This one maybe invalid, need investigate
  TSAbstractMethodDefinition: ["decorators"],

  // Flow
  BigIntTypeAnnotation: [],
  QualifiedTypeofIdentifier: ["id", "qualification"],
  ClassProperty: ["variance"],
  ClassPrivateProperty: ["variance"],
  DeclareEnum: flowVisitorKeys.EnumDeclaration,
  TupleTypeAnnotation: ["elementTypes"],
  TupleTypeSpreadElement: ["label", "typeAnnotation"],
  TupleTypeLabeledElement: ["label", "elementType", "variance"],
  NeverTypeAnnotation: [],
  UndefinedTypeAnnotation: [],
  UnknownTypeAnnotation: [],

  // Unknown
  Property: ["decorators"],
};

const excludeKeys = {
  // From `tsVisitorKeys`
  MethodDefinition: ["typeParameters"],

  // From `flowVisitorKeys`
  ArrowFunctionExpression: ["id"],
  DeclareOpaqueType: ["impltype"],
  FunctionExpression: ["predicate"],
  // TODO: Remove `types` when babel changes AST of `TupleTypeAnnotation`
  // Flow parser changed `.types` to `.elementTypes` https://github.com/facebook/flow/commit/5b60e6a81dc277dfab2e88fa3737a4dc9aafdcab
  // TupleTypeAnnotation: ["types"],
  DeclareInterface: ["mixins", "implements"],
  InterfaceDeclaration: ["mixins", "implements"],
  PropertyDefinition: ["tsModifiers"],

  // TypeScript
  TSPropertySignature: ["initializer"],
};

const visitorKeys = Object.fromEntries(
  Object.entries(
    unionVisitorKeys([
      babelVisitorKeys,
      tsVisitorKeys,
      flowVisitorKeys,
      angularVisitorKeys,
      additionalVisitorKeys,
    ])
  ).map(([type, keys]) => [
    type,
    excludeKeys[type]
      ? keys.filter((key) => !excludeKeys[type].includes(key))
      : keys,
  ])
);

export default visitorKeys;
