import * as ts from 'typescript';
import { evaluate, requiresRuntimeResult, isRequiresRuntimeResult } from './evaluator';

export const generatedClassNames: { [mediaQuery: string]: { [cssRule: string]: string } } = { '': {} };

export const moduleName = '@glitz/react';
export const styledName = 'styled';

type StaticStyledComponent = {
  componentName: string;
  elementName: string;
  cssData: CssData;
  parent?: StaticStyledComponent;
};

type CssData = {
  classNames: string[];
  styleObject: ts.ObjectLiteralExpression;
};

type StaticStyledComponents = { [name: string]: StaticStyledComponent };

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    if (file.fileName.endsWith('.tsx')) {
      const staticStyledComponent: StaticStyledComponents = {};
      // TODO: Maybe only run the first pass on top level statements?
      const firstPassTransformedFile = visitNodeAndChildren(file, program, context, staticStyledComponent);
      return visitNodeAndChildren(firstPassTransformedFile, program, context, staticStyledComponent);
    } else {
      return file;
    }
  };
}

function visitNodeAndChildren(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
  staticStyledComponent: StaticStyledComponents,
): ts.SourceFile;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
  staticStyledComponent: StaticStyledComponents,
): ts.Node | ts.Node[];
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
  staticStyledComponent: StaticStyledComponents,
): ts.Node | ts.Node[] {
  return ts.visitEachChild(
    visitNode(node, program, staticStyledComponent),
    (childNode) => visitNodeAndChildren(childNode, program, context, staticStyledComponent),
    context,
  );
}

function visitNode(node: ts.Node, program: ts.Program, staticStyledComponent: StaticStyledComponents): any /* TODO */ {
  const typeChecker = program.getTypeChecker();
  if (ts.isImportDeclaration(node)) {
    if ((node.moduleSpecifier as ts.StringLiteral).text === moduleName) {
      // TODO: Should only do this if the only thing imported is the static/styledx import
      //return [];

      // TODO: Do we need to remove this? Will it get dead code eliminated?
      return node;
    }
  }
  if (ts.isVariableStatement(node)) {
    if (node.declarationList.declarations.length === 1) {
      const declaration = node.declarationList.declarations[0];
      if (
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        ts.isIdentifier(declaration.name)
      ) {
        const callExpr = declaration.initializer;
        const componentName = declaration.name.escapedText.toString();

        if (ts.isPropertyAccessExpression(callExpr.expression) && ts.isIdentifier(callExpr.expression.expression)) {
          if (callExpr.expression.expression.escapedText === styledName) {
            const elementName = callExpr.expression.name.escapedText.toString();
            const styleObject = callExpr.arguments[0];
            if (callExpr.arguments.length === 1 && !!styleObject && ts.isObjectLiteralExpression(styleObject)) {
              const cssData = getCssData(styleObject, typeChecker);
              if (!isRequiresRuntimeResult(cssData)) {
                staticStyledComponent[componentName] = {
                  componentName,
                  elementName,
                  cssData,
                };
                return [];
              }
            }
          }
        }
        if (
          ts.isIdentifier(callExpr.expression) &&
          callExpr.expression.escapedText.toString() === styledName &&
          callExpr.arguments.length === 2
        ) {
          const parentStyledComponent = callExpr.arguments[0];
          const styleObject = callExpr.arguments[1];

          if (ts.isIdentifier(parentStyledComponent) && ts.isObjectLiteralExpression(styleObject)) {
            const parentName = parentStyledComponent.escapedText.toString();
            const parent = staticStyledComponent[parentName];
            if (parent) {
              const cssData = getCssData(styleObject, typeChecker, parent);
              if (!isRequiresRuntimeResult(cssData)) {
                if (staticStyledComponent[parentName]) {
                  staticStyledComponent[componentName] = {
                    componentName,
                    elementName: staticStyledComponent[parentName].elementName,
                    cssData,
                  };
                  return [];
                }
              }
            }
          }
        }
      }
    }
  }

  if (
    ts.isJsxSelfClosingElement(node) &&
    ts.isPropertyAccessExpression(node.tagName) &&
    ts.isIdentifier(node.tagName.expression) &&
    node.tagName.expression.escapedText.toString() === styledName
  ) {
    const elementName = node.tagName.name.escapedText.toString().toLowerCase();
    const cssJsxAttr = node.attributes.properties.find(
      (p) => p.name && ts.isIdentifier(p.name) && p.name.escapedText.toString() === 'css',
    );
    if (
      cssJsxAttr &&
      ts.isJsxAttribute(cssJsxAttr) &&
      cssJsxAttr.initializer &&
      ts.isJsxExpression(cssJsxAttr.initializer) &&
      cssJsxAttr.initializer.expression &&
      ts.isObjectLiteralExpression(cssJsxAttr.initializer.expression)
    ) {
      const cssData = getCssData(cssJsxAttr.initializer.expression, typeChecker);
      if (!isRequiresRuntimeResult(cssData)) {
        const classNames = cssData.classNames;
        const jsxElement = ts.createJsxSelfClosingElement(
          ts.createIdentifier(elementName),
          undefined,
          ts.createJsxAttributes([
            ...passThroughProps(node.attributes.properties),
            ts.createJsxAttribute(ts.createIdentifier('className'), ts.createStringLiteral(classNames.join(' '))),
          ]),
        );
        ts.setOriginalNode(jsxElement, node);
        return jsxElement;
      }
    }
  }

  if (ts.isJsxElement(node)) {
    const openingElement = node.openingElement;
    if (
      ts.isPropertyAccessExpression(openingElement.tagName) &&
      ts.isIdentifier(openingElement.tagName.expression) &&
      openingElement.tagName.expression.escapedText.toString() === styledName
    ) {
      const elementName = openingElement.tagName.name.escapedText.toString().toLowerCase();
      const cssJsxAttr = openingElement.attributes.properties.find(
        (p) => p.name && ts.isIdentifier(p.name) && p.name.escapedText.toString() === 'css',
      );
      if (
        cssJsxAttr &&
        ts.isJsxAttribute(cssJsxAttr) &&
        cssJsxAttr.initializer &&
        ts.isJsxExpression(cssJsxAttr.initializer) &&
        cssJsxAttr.initializer.expression &&
        ts.isObjectLiteralExpression(cssJsxAttr.initializer.expression)
      ) {
        const cssData = getCssData(cssJsxAttr.initializer.expression, typeChecker);
        if (!isRequiresRuntimeResult(cssData)) {
          const classNames = cssData.classNames;
          const jsxElement = ts.createJsxElement(
            ts.createJsxOpeningElement(
              ts.createIdentifier(elementName),
              undefined,
              ts.createJsxAttributes([
                ...passThroughProps(node.openingElement.attributes.properties),
                ts.createJsxAttribute(ts.createIdentifier('className'), ts.createStringLiteral(classNames.join(' '))),
              ]),
            ),
            node.children,
            ts.createJsxClosingElement(ts.createIdentifier(elementName)),
          );
          ts.setOriginalNode(jsxElement, node);
          return jsxElement;
        }
      }
    }

    if (ts.isIdentifier(openingElement.tagName) && ts.isIdentifier(openingElement.tagName)) {
      const jsxTagName = openingElement.tagName.escapedText.toString();
      if (staticStyledComponent[jsxTagName]) {
        const jsxElement = ts.createJsxElement(
          ts.createJsxOpeningElement(
            ts.createIdentifier(staticStyledComponent[jsxTagName].elementName),
            undefined,
            ts.createJsxAttributes([
              ...passThroughProps(node.openingElement.attributes.properties),
              ts.createJsxAttribute(
                ts.createIdentifier('className'),
                ts.createStringLiteral(staticStyledComponent[jsxTagName].cssData.classNames.join(' ')),
              ),
            ]),
          ),
          node.children,
          ts.createJsxClosingElement(ts.createIdentifier(staticStyledComponent[jsxTagName].elementName)),
        );
        ts.setOriginalNode(jsxElement, node);
        return jsxElement;
      }
    }
  }

  if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName)) {
    const jsxTagName = node.tagName.escapedText.toString();
    if (staticStyledComponent[jsxTagName]) {
      const jsxElement = ts.createJsxSelfClosingElement(
        ts.createIdentifier(staticStyledComponent[jsxTagName].elementName),
        undefined,
        ts.createJsxAttributes([
          ...passThroughProps(node.attributes.properties),
          ts.createJsxAttribute(
            ts.createIdentifier('className'),
            ts.createStringLiteral(staticStyledComponent[jsxTagName].cssData.classNames.join(' ')),
          ),
        ]),
      );
      ts.setOriginalNode(jsxElement, node);
      return jsxElement;
    }
  }

  return node;
}

function getCssData(
  styleObject: ts.ObjectLiteralExpression,
  typeChecker: ts.TypeChecker,
  parentComponent?: StaticStyledComponent,
) {
  const classNames: string[] = [];
  const cssRules = {};

  const obj = evaluate(styleObject, typeChecker, {}) as any;
  if (isRequiresRuntimeResult(obj)) {
    const diag = obj.getDiagnostics();
    return obj;
  }

  if (parentComponent) {
    const parentObj = evaluate(parentComponent.cssData.styleObject, typeChecker, {}) as any;
    if (isRequiresRuntimeResult(parentObj)) {
      const diag = obj.getDiagnostics();
      return parentObj;
    }
    for (const key of Object.keys(parentObj)) {
      if (!(key in obj)) {
        if (typeof parentObj[key] === 'function') {
          return requiresRuntimeResult('Styled properties as functions needs to be resolved at runtime', styleObject);
        }
        obj[key] = parentObj[key];
      }
    }
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'function') {
      return requiresRuntimeResult('Styled properties as functions needs to be resolved at runtime', styleObject);
    }
  }
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      const mediaQuery = key;
      if (!(mediaQuery in generatedClassNames)) {
        generatedClassNames[mediaQuery] = {};
      }
      const index = Object.keys(generatedClassNames).indexOf(mediaQuery);
      for (const innerKey of Object.keys(obj[mediaQuery])) {
        const css = `${innerKey}: '${obj[mediaQuery][innerKey]}'`;
        if (!(css in generatedClassNames[mediaQuery])) {
          generatedClassNames[mediaQuery][css] = 'm' + index + Object.keys(generatedClassNames[mediaQuery]).length;
        }
        classNames.push(generatedClassNames[mediaQuery][css]);
      }
    } else {
      const css = `${key}: '${obj[key]}'`;
      if (!(css in generatedClassNames[''])) {
        generatedClassNames[''][css] = 'a' + Object.keys(generatedClassNames['']).length;
      }
      classNames.push(generatedClassNames[''][css]);
    }
  }

  return {
    classNames,
    cssRules,
    styleObject,
  };
}

function passThroughProps(props: ts.NodeArray<ts.JsxAttributeLike>) {
  return props.filter((p) => {
    if (p.name && ts.isIdentifier(p.name)) {
      return p.name.text !== 'css';
    }
    return true;
  });
}
