import { printDanglingComments } from "../../main/comments.js";
import { hasNewlineInRange } from "../../common/util.js";
import {
  join,
  line,
  softline,
  group,
  indent,
  conditionalGroup,
  ifBreak,
} from "../../document/builders.js";
import UnexpectedNodeError from "../../utils/unexpected-node-error.js";
import {
  isStringLiteral,
  getTypeScriptMappedTypeModifier,
  shouldPrintComma,
  isCallExpression,
  isMemberExpression,
  isArrayOrTupleExpression,
  isObjectOrRecordExpression,
} from "../utils/index.js";
import isTsKeywordType from "../utils/is-ts-keyword-type.js";
import { locStart, locEnd } from "../loc.js";

import { printOptionalToken, printTypeScriptModifiers } from "./misc.js";
import { printTernary } from "./ternary.js";
import {
  printFunctionParameters,
  shouldGroupFunctionParameters,
} from "./function-parameters.js";
import { printTemplateLiteral } from "./template-literal.js";
import { printArray } from "./array.js";
import { printObject } from "./object.js";
import { printClassProperty, printClassMethod } from "./class.js";
import { printTypeParameter, printTypeParameters } from "./type-parameters.js";
import { printPropertyKey } from "./property.js";
import { printFunction, printMethodInternal } from "./function.js";
import { printInterface } from "./interface.js";
import { printBlock } from "./block.js";
import {
  printTypeAlias,
  printIntersectionType,
  printUnionType,
  printFunctionType,
  printIndexedAccessType,
  printJSDocType,
  printTypeAnnotation,
  printTypeAnnotationProperty,
} from "./type-annotation.js";
import { printEnumDeclaration, printEnumMember } from "./enum.js";
import { printDeclareToken } from "./misc.js";

function printTypescript(path, options, print) {
  const { node } = path;

  // TypeScript nodes always starts with `TS`
  if (!node.type.startsWith("TS")) {
    return;
  }

  if (isTsKeywordType(node)) {
    return node.type.slice(2, -7).toLowerCase();
  }

  const semi = options.semi ? ";" : "";
  const parts = [];

  switch (node.type) {
    case "TSThisType":
      return "this";
    case "TSTypeAssertion": {
      const shouldBreakAfterCast = !(
        isArrayOrTupleExpression(node.expression) ||
        isObjectOrRecordExpression(node.expression)
      );

      const castGroup = group([
        "<",
        indent([softline, print("typeAnnotation")]),
        softline,
        ">",
      ]);

      const exprContents = [
        ifBreak("("),
        indent([softline, print("expression")]),
        softline,
        ifBreak(")"),
      ];

      if (shouldBreakAfterCast) {
        return conditionalGroup([
          [castGroup, print("expression")],
          [castGroup, group(exprContents, { shouldBreak: true })],
          [castGroup, print("expression")],
        ]);
      }
      return group([castGroup, print("expression")]);
    }
    case "TSDeclareFunction":
      return printFunction(path, print, options);
    case "TSExportAssignment":
      return ["export = ", print("expression"), semi];
    case "TSModuleBlock":
      return printBlock(path, options, print);
    case "TSInterfaceBody":
    case "TSTypeLiteral":
      return printObject(path, options, print);
    case "TSTypeAliasDeclaration":
      return printTypeAlias(path, options, print);
    case "TSQualifiedName":
      return join(".", [print("left"), print("right")]);
    case "TSAbstractMethodDefinition":
    case "TSDeclareMethod":
      return printClassMethod(path, options, print);
    case "TSAbstractAccessorProperty":
    case "TSAbstractPropertyDefinition":
      return printClassProperty(path, options, print);
    case "TSInterfaceHeritage":
    case "TSExpressionWithTypeArguments": // Babel AST
      parts.push(print("expression"));

      if (node.typeParameters) {
        parts.push(print("typeParameters"));
      }

      return parts;
    case "TSTemplateLiteralType":
      return printTemplateLiteral(path, print, options);
    case "TSNamedTupleMember":
      return [
        print("label"),
        node.optional ? "?" : "",
        ": ",
        print("elementType"),
      ];
    case "TSRestType":
      return ["...", print("typeAnnotation")];
    case "TSOptionalType":
      return [print("typeAnnotation"), "?"];
    case "TSInterfaceDeclaration":
      return printInterface(path, options, print);
    case "TSClassImplements":
      return [print("expression"), print("typeParameters")];
    case "TSTypeParameterDeclaration":
    case "TSTypeParameterInstantiation":
      return printTypeParameters(path, options, print, "params");
    case "TSTypeParameter":
      return printTypeParameter(path, options, print);
    case "TSAsExpression":
    case "TSSatisfiesExpression": {
      const operator = node.type === "TSAsExpression" ? "as" : "satisfies";
      parts.push(print("expression"), ` ${operator} `, print("typeAnnotation"));
      const { parent } = path;
      if (
        (isCallExpression(parent) && parent.callee === node) ||
        (isMemberExpression(parent) && parent.object === node)
      ) {
        return group([indent([softline, ...parts]), softline]);
      }
      return parts;
    }
    case "TSArrayType":
      return [print("elementType"), "[]"];
    case "TSPropertySignature":
      if (node.readonly) {
        parts.push("readonly ");
      }

      parts.push(
        printPropertyKey(path, options, print),
        printOptionalToken(path),
        printTypeAnnotationProperty(path, print)
      );

      // This isn't valid semantically, but it's in the AST so we can print it.
      if (node.initializer) {
        parts.push(" = ", print("initializer"));
      }

      return parts;

    case "TSParameterProperty":
      if (node.accessibility) {
        parts.push(node.accessibility + " ");
      }
      if (node.export) {
        parts.push("export ");
      }
      if (node.static) {
        parts.push("static ");
      }
      if (node.override) {
        parts.push("override ");
      }
      if (node.readonly) {
        parts.push("readonly ");
      }

      parts.push(print("parameter"));

      return parts;
    case "TSTypeQuery":
      return ["typeof ", print("exprName"), print("typeParameters")];
    case "TSIndexSignature": {
      const { parent } = path;

      // The typescript parser accepts multiple parameters here. If you're
      // using them, it makes sense to have a trailing comma. But if you
      // aren't, this is more like a computed property name than an array.
      // So we leave off the trailing comma when there's just one parameter.
      const trailingComma =
        node.parameters.length > 1
          ? ifBreak(shouldPrintComma(options) ? "," : "")
          : "";

      const parametersGroup = group([
        indent([
          softline,
          join([", ", softline], path.map(print, "parameters")),
        ]),
        trailingComma,
        softline,
      ]);

      return [
        node.export ? "export " : "",
        node.accessibility ? [node.accessibility, " "] : "",
        node.static ? "static " : "",
        node.readonly ? "readonly " : "",
        printDeclareToken(path),
        "[",
        node.parameters ? parametersGroup : "",
        "]",
        printTypeAnnotationProperty(path, print),
        parent.type === "ClassBody" ? semi : "",
      ];
    }
    case "TSTypePredicate":
      return [
        node.asserts ? "asserts " : "",
        print("parameterName"),
        node.typeAnnotation
          ? [" is ", printTypeAnnotationProperty(path, print)]
          : "",
      ];
    case "TSNonNullExpression":
      return [print("expression"), "!"];
    case "TSImportType":
      return [
        !node.isTypeOf ? "" : "typeof ",
        "import(",
        print(node.parameter ? "parameter" : "argument"),
        ")",
        !node.qualifier ? "" : [".", print("qualifier")],
        printTypeParameters(path, options, print, "typeParameters"),
      ];
    case "TSLiteralType":
      return print("literal");
    case "TSIndexedAccessType":
      return printIndexedAccessType(path, options, print);
    case "TSConstructSignatureDeclaration":
    case "TSCallSignatureDeclaration":
    case "TSConstructorType":
      if (node.type === "TSConstructorType" && node.abstract) {
        parts.push("abstract ");
      }
      if (node.type !== "TSCallSignatureDeclaration") {
        parts.push("new ");
      }

      parts.push(
        group(
          printFunctionParameters(
            path,
            print,
            options,
            /* expandArg */ false,
            /* printTypeParams */ true
          )
        )
      );

      if (node.returnType || node.typeAnnotation) {
        parts.push(
          printTypeAnnotationProperty(
            path,
            print,
            node.returnType ? "returnType" : "typeAnnotation"
          )
        );
      }
      return parts;

    case "TSTypeOperator":
      return [node.operator, " ", print("typeAnnotation")];
    case "TSMappedType": {
      const shouldBreak = hasNewlineInRange(
        options.originalText,
        locStart(node),
        locEnd(node)
      );
      return group(
        [
          "{",
          indent([
            options.bracketSpacing ? line : softline,
            print("typeParameter"),
            node.optional
              ? getTypeScriptMappedTypeModifier(node.optional, "?")
              : "",
            node.typeAnnotation ? ": " : "",
            print("typeAnnotation"),
            ifBreak(semi),
          ]),
          printDanglingComments(path, options, /* sameIndent */ true),
          options.bracketSpacing ? line : softline,
          "}",
        ],
        { shouldBreak }
      );
    }
    case "TSMethodSignature": {
      const kind = node.kind && node.kind !== "method" ? `${node.kind} ` : "";
      parts.push(
        node.accessibility ? [node.accessibility, " "] : "",
        kind,
        node.computed ? "[" : "",
        print("key"),
        node.computed ? "]" : "",
        printOptionalToken(path)
      );

      const parametersDoc = printFunctionParameters(
        path,
        print,
        options,
        /* expandArg */ false,
        /* printTypeParams */ true
      );

      const returnTypePropertyName = node.returnType
        ? "returnType"
        : "typeAnnotation";
      const returnTypeNode = node[returnTypePropertyName];
      const returnTypeDoc = returnTypeNode
        ? printTypeAnnotationProperty(path, print, returnTypePropertyName)
        : "";
      const shouldGroupParameters = shouldGroupFunctionParameters(
        node,
        returnTypeDoc
      );

      parts.push(shouldGroupParameters ? group(parametersDoc) : parametersDoc);

      if (returnTypeNode) {
        parts.push(group(returnTypeDoc));
      }

      return group(parts);
    }
    case "TSNamespaceExportDeclaration":
      parts.push("export as namespace ", print("id"));

      if (options.semi) {
        parts.push(";");
      }

      return group(parts);
    case "TSEnumDeclaration":
      return printEnumDeclaration(path, print, options);

    case "TSEnumMember":
      return printEnumMember(path, print);

    case "TSImportEqualsDeclaration":
      if (node.isExport) {
        parts.push("export ");
      }

      parts.push("import ");

      if (node.importKind && node.importKind !== "value") {
        parts.push(node.importKind, " ");
      }

      parts.push(print("id"), " = ", print("moduleReference"));

      if (options.semi) {
        parts.push(";");
      }

      return group(parts);
    case "TSExternalModuleReference":
      return ["require(", print("expression"), ")"];
    case "TSModuleDeclaration": {
      const { parent } = path;
      const isExternalModule = isStringLiteral(node.id);
      const parentIsDeclaration = parent.type === "TSModuleDeclaration";
      const bodyIsDeclaration = node.body?.type === "TSModuleDeclaration";

      if (parentIsDeclaration) {
        parts.push(".");
      } else {
        parts.push(
          printDeclareToken(path),
          printTypeScriptModifiers(path, options, print)
        );

        // Global declaration looks like this:
        // (declare)? global { ... }
        if (!node.global) {
          parts.push(
            isExternalModule ||
              /(?:^|\s)module(?:\s|$)/.test(
                options.originalText.slice(locStart(node), locStart(node.id))
              )
              ? "module "
              : "namespace "
          );
        }
      }

      parts.push(print("id"));

      if (bodyIsDeclaration) {
        parts.push(print("body"));
      } else if (node.body) {
        parts.push(" ", group(print("body")));
      } else {
        parts.push(semi);
      }

      return parts;
    }

    case "TSConditionalType":
      return printTernary(path, options, print);

    case "TSInferType":
      return ["infer", " ", print("typeParameter")];
    case "TSIntersectionType":
      return printIntersectionType(path, options, print);
    case "TSUnionType":
      return printUnionType(path, options, print);
    case "TSFunctionType":
      return printFunctionType(path, options, print);
    case "TSTupleType":
      return printArray(path, options, print);
    case "TSTypeReference":
      return [
        print("typeName"),
        printTypeParameters(path, options, print, "typeParameters"),
      ];
    case "TSTypeAnnotation":
      return printTypeAnnotation(path, options, print);
    case "TSEmptyBodyFunctionExpression":
      return printMethodInternal(path, options, print);

    // These are not valid TypeScript. Printing them just for the sake of error recovery.
    case "TSJSDocAllType":
      return "*";
    case "TSJSDocUnknownType":
      return "?";
    case "TSJSDocNullableType":
      return printJSDocType(path, print, /* token */ "?");
    case "TSJSDocNonNullableType":
      return printJSDocType(path, print, /* token */ "!");
    case "TSInstantiationExpression":
      return [print("expression"), print("typeParameters")];
    default:
      /* c8 ignore next */
      throw new UnexpectedNodeError(node, "TypeScript");
  }
}

export { printTypescript };
