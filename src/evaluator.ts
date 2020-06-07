import * as ts from 'typescript';

export function evaluate(expr: ts.Expression, typeChecker: ts.TypeChecker): any {
  if (ts.isBinaryExpression(expr)) {
    if (expr.operatorToken.kind == ts.SyntaxKind.PlusToken) {
      return evaluate(expr.left, typeChecker) + evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.MinusToken) {
      return evaluate(expr.left, typeChecker) - evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.AsteriskToken) {
      return evaluate(expr.left, typeChecker) * evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.SlashToken) {
      return evaluate(expr.left, typeChecker) / evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.EqualsEqualsEqualsToken) {
      return evaluate(expr.left, typeChecker) === evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.EqualsEqualsToken) {
      return evaluate(expr.left, typeChecker) == evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.ExclamationEqualsEqualsToken) {
      return evaluate(expr.left, typeChecker) !== evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.ExclamationEqualsToken) {
      return evaluate(expr.left, typeChecker) != evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.GreaterThanToken) {
      return evaluate(expr.left, typeChecker) > evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.GreaterThanEqualsToken) {
      return evaluate(expr.left, typeChecker) >= evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.LessThanToken) {
      return evaluate(expr.left, typeChecker) < evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.LessThanEqualsToken) {
      return evaluate(expr.left, typeChecker) <= evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.BarBarToken) {
      return evaluate(expr.left, typeChecker) || evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.AmpersandAmpersandToken) {
      return evaluate(expr.left, typeChecker) && evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.QuestionQuestionToken) {
      const left = evaluate(expr.left, typeChecker);
      if (left !== undefined && left !== null) {
        return left;
      }
      return evaluate(expr.right, typeChecker);
    } else if (expr.operatorToken.kind == ts.SyntaxKind.InKeyword) {
      const right = evaluate(expr.right, typeChecker);
      if (!right) return false;
      if (typeof right === 'object' && right instanceof Array) {
        return right.indexOf(evaluate(expr.left, typeChecker)) !== -1;
      }
      return false;
    }
  } else if (ts.isConditionalExpression(expr)) {
    return evaluate(expr.condition, typeChecker)
      ? evaluate(expr.whenTrue, typeChecker)
      : evaluate(expr.whenFalse, typeChecker);
  } else if (ts.isPrefixUnaryExpression(expr)) {
    if (expr.operator == ts.SyntaxKind.PlusPlusToken || expr.operator == ts.SyntaxKind.MinusMinusToken) {
      throw new Error('-- or ++ expressions are not supported');
    }
    if (expr.operator == ts.SyntaxKind.PlusToken) {
      return +evaluate(expr.operand, typeChecker);
    }
    if (expr.operator == ts.SyntaxKind.MinusToken) {
      return -evaluate(expr.operand, typeChecker);
    }
    if (expr.operator == ts.SyntaxKind.TildeToken) {
      return ~evaluate(expr.operand, typeChecker);
    }
    if (expr.operator == ts.SyntaxKind.ExclamationToken) {
      return !evaluate(expr.operand, typeChecker);
    }
  } else if (ts.isPropertyAccessExpression(expr)) {
    const obj = evaluate(expr.expression, typeChecker);
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = expr.name.escapedText.toString();
    return obj[property];
  } else if (ts.isElementAccessExpression(expr)) {
    const obj = evaluate(expr.expression, typeChecker);
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = evaluate(expr.argumentExpression, typeChecker);
    return obj[property];
  } else if (ts.isTaggedTemplateExpression(expr)) {
    throw new Error('Tagged templates are not supported');
  } else if (ts.isTemplateExpression(expr)) {
    let s = expr.head.text;
    for (const span of expr.templateSpans) {
      s += evaluate(span.expression, typeChecker);
      s += span.literal.text;
    }
  } else if (ts.isIdentifier(expr)) {
    const type = typeChecker.getTypeAtLocation(expr);
    if (type.isStringLiteral()) {
      return type.value;
    }
    let symbol = typeChecker.getSymbolAtLocation(expr);
    if (!symbol) {
      throw new Error(`Unable to resolve identifier '${expr.text}'`);
    }
    if (!symbol.valueDeclaration) {
      const importSpecifier = symbol.declarations[0];
      if (ts.isImportSpecifier(importSpecifier)) {
        const x = importSpecifier.parent;
        const importSymbol = typeChecker.getSymbolAtLocation(x.parent.parent.moduleSpecifier);
        if (importSymbol) {
          const exports = typeChecker.getExportsOfModule(importSymbol);
          for (const exp of exports) {
            if (exp.escapedName === expr.text) {
              symbol = exp;
              break;
            }
          }
        }
      }
    }
    if (ts.isShorthandPropertyAssignment(symbol.valueDeclaration)) {
      symbol = typeChecker.getShorthandAssignmentValueSymbol(symbol.valueDeclaration);
    }
    if (!symbol) {
      throw new Error(`Unable to resolve identifier '${expr.text}'`);
    }
    if (ts.isVariableDeclaration(symbol.valueDeclaration)) {
      if (!symbol.valueDeclaration.initializer) {
        throw new Error(`Unable to resolve identifier '${expr.text}'`);
      }
      return evaluate(symbol.valueDeclaration.initializer, typeChecker);
    }
    throw new Error('Not implemented:' + expr.text);
  } else if (ts.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.text;
  } else if (ts.isStringLiteral(expr)) {
    return expr.text;
  } else if (ts.isNumericLiteral(expr)) {
    return Number(expr.text);
  } else if (expr.kind == ts.SyntaxKind.TrueKeyword) {
    return true;
  } else if (expr.kind == ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  throw new Error('Unable to evaluate expression, unsupported expression token kind: ' + expr.kind);
}
