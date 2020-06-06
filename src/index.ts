import * as ts from 'typescript';

export const moduleName = './styledx';
export const styledxName = 'styledx';

type StaticStyledComponent = {
  componentName: string;
  elementName: string;
  classNames: string[];
};

type StaticStyledComponents = { [name: string]: StaticStyledComponent };

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    const staticStyledComponent: StaticStyledComponents = {};
    const firstPassTransformedFile = visitNodeAndChildren(file, program, context, staticStyledComponent);
    return visitNodeAndChildren(firstPassTransformedFile, program, context, staticStyledComponent);
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
      return [];
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
        if (ts.isPropertyAccessExpression(callExpr.expression) && ts.isIdentifier(callExpr.expression.expression)) {
          if (callExpr.expression.expression.escapedText === styledxName) {
            const componentName = declaration.name.escapedText.toString();
            const elementName = callExpr.expression.name.escapedText.toString();
            const styleObject = callExpr.arguments[0];
            if (callExpr.arguments.length === 1 && !!styleObject && ts.isObjectLiteralExpression(styleObject)) {
              const classNames = styleObject.properties.map(getClassName);
              staticStyledComponent[componentName] = {
                classNames,
                componentName,
                elementName,
              };
              return [];
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
    node.tagName.expression.escapedText.toString() === styledxName
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
      const classNames = cssJsxAttr.initializer.expression.properties.map(getClassName);
      return ts.createJsxSelfClosingElement(
        ts.createIdentifier(elementName),
        undefined,
        ts.createJsxAttributes([
          ts.createJsxAttribute(ts.createIdentifier('className'), ts.createStringLiteral(classNames.join(' '))),
        ]),
      );
    }
  }

  if (
    ts.isJsxOpeningElement(node) &&
    ts.isPropertyAccessExpression(node.tagName) &&
    ts.isIdentifier(node.tagName.expression) &&
    node.tagName.expression.escapedText.toString() === styledxName
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
      const classNames = cssJsxAttr.initializer.expression.properties.map(getClassName);
      return ts.createJsxOpeningElement(
        ts.createIdentifier(elementName),
        undefined,
        ts.createJsxAttributes([
          ts.createJsxAttribute(ts.createIdentifier('className'), ts.createStringLiteral(classNames.join(' '))),
        ]),
      );
    }
  }

  if (
    ts.isJsxClosingElement(node) &&
    ts.isPropertyAccessExpression(node.tagName) &&
    ts.isIdentifier(node.tagName.expression) &&
    node.tagName.expression.escapedText.toString() === styledxName
  ) {
    const elementName = node.tagName.name.escapedText.toString().toLowerCase();
    return ts.createJsxClosingElement(ts.createIdentifier(elementName));
  }

  if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName)) {
    const jsxTagName = node.tagName.escapedText.toString();
    if (staticStyledComponent[jsxTagName]) {
      return ts.createJsxSelfClosingElement(
        ts.createIdentifier(staticStyledComponent[jsxTagName].elementName),
        undefined,
        ts.createJsxAttributes([
          ts.createJsxAttribute(
            ts.createIdentifier('className'),
            ts.createStringLiteral(staticStyledComponent[jsxTagName].classNames.join(' ')),
          ),
        ]),
      );
    }
  }

  if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) {
    const jsxTagName = node.tagName.escapedText.toString();
    if (staticStyledComponent[jsxTagName]) {
      return ts.createJsxOpeningElement(
        ts.createIdentifier(staticStyledComponent[jsxTagName].elementName),
        undefined,
        ts.createJsxAttributes([
          ts.createJsxAttribute(
            ts.createIdentifier('className'),
            ts.createStringLiteral(staticStyledComponent[jsxTagName].classNames.join(' ')),
          ),
        ]),
      );
    }
  }
  if (ts.isJsxClosingElement(node) && ts.isIdentifier(node.tagName)) {
    const jsxTagName = node.tagName.escapedText.toString();
    if (staticStyledComponent[jsxTagName]) {
      return ts.createJsxClosingElement(ts.createIdentifier(staticStyledComponent[jsxTagName].elementName));
    }
  }
  return node;
}

function getClassName(rule: ts.ObjectLiteralElementLike) {
  return 'a';
}
