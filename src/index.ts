import * as ts from 'typescript';

export const moduleName = './styledx';
export const styledxName = 'styledx';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(
  node: ts.SourceFile,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.SourceFile;
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | ts.Node[];
function visitNodeAndChildren(
  node: ts.Node,
  program: ts.Program,
  context: ts.TransformationContext,
): ts.Node | ts.Node[] {
  return ts.visitEachChild(
    visitNode(node, program),
    (childNode) => visitNodeAndChildren(childNode, program, context),
    context,
  );
}

function visitNode(node: ts.Node, program: ts.Program): any /* TODO */ {
  const typeChecker = program.getTypeChecker();
  if (ts.isImportDeclaration(node)) {
    if ((node.moduleSpecifier as ts.StringLiteral).text === moduleName) {
      return [];
    }
  }
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
      if (node.expression.expression.escapedText === styledxName) {
        const htmlElementName = node.expression.name.escapedText.toString();
        const styleObject = node.arguments[0];
        if (node.arguments.length === 1 && !!styleObject && ts.isObjectLiteralExpression(styleObject)) {
          const classNames = styleObject.properties.map(getClassName);
          return ts.createJsxSelfClosingElement(
            ts.createIdentifier(htmlElementName),
            undefined,
            ts.createJsxAttributes([
              ts.createJsxAttribute(ts.createIdentifier('className'), ts.createStringLiteral(classNames.join(' '))),
            ]),
          );
        }
      }
    }
  }
  return node;
}

function getClassName(rule: ts.ObjectLiteralElementLike) {
  return 'a';
}
