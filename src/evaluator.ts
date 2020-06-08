import * as ts from 'typescript';

export function evaluate(expr: ts.Expression, typeChecker: ts.TypeChecker, scope: { [name: string]: any }): any {
  if (ts.isBinaryExpression(expr)) {
    const left = evaluate(expr.left, typeChecker, scope);
    const right = evaluate(expr.right, typeChecker, scope);
    if (expr.operatorToken.kind == ts.SyntaxKind.PlusToken) {
      return left + right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.MinusToken) {
      return left - right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.AsteriskToken) {
      return left * right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.SlashToken) {
      return left / right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.EqualsEqualsEqualsToken) {
      return left === right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.EqualsEqualsToken) {
      return left == right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.ExclamationEqualsEqualsToken) {
      return left !== right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.ExclamationEqualsToken) {
      return left != right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.GreaterThanToken) {
      return left > right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.GreaterThanEqualsToken) {
      return left >= right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.LessThanToken) {
      return left < right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.LessThanEqualsToken) {
      return left <= right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.BarBarToken) {
      return left || right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.AmpersandAmpersandToken) {
      return left && right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.QuestionQuestionToken) {
      if (left !== undefined && left !== null) {
        return left;
      }
      return right;
    } else if (expr.operatorToken.kind == ts.SyntaxKind.InKeyword) {
      if (!right) {
        return false;
      }
      if (typeof right === 'object' && right instanceof Array) {
        return right.indexOf(left) !== -1;
      }
      return false;
    }
  } else if (ts.isConditionalExpression(expr)) {
    return evaluate(expr.condition, typeChecker, scope)
      ? evaluate(expr.whenTrue, typeChecker, scope)
      : evaluate(expr.whenFalse, typeChecker, scope);
  } else if (ts.isPrefixUnaryExpression(expr)) {
    if (expr.operator == ts.SyntaxKind.PlusPlusToken || expr.operator == ts.SyntaxKind.MinusMinusToken) {
      throw new Error('-- or ++ expressions are not supported');
    }
    const value = evaluate(expr.operand, typeChecker, scope);
    if (expr.operator == ts.SyntaxKind.PlusToken) {
      return +value;
    }
    if (expr.operator == ts.SyntaxKind.MinusToken) {
      return -value;
    }
    if (expr.operator == ts.SyntaxKind.TildeToken) {
      return ~value;
    }
    if (expr.operator == ts.SyntaxKind.ExclamationToken) {
      return !value;
    }
  } else if (ts.isPropertyAccessExpression(expr)) {
    const obj = evaluate(expr.expression, typeChecker, scope);
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = expr.name.escapedText.toString();
    return obj[property];
  } else if (ts.isElementAccessExpression(expr)) {
    const obj = evaluate(expr.expression, typeChecker, scope);
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = evaluate(expr.argumentExpression, typeChecker, scope);
    return obj[property];
  } else if (ts.isTaggedTemplateExpression(expr)) {
    throw new Error('Tagged templates are not supported');
  } else if (ts.isTemplateExpression(expr)) {
    let s = expr.head.text;
    for (const span of expr.templateSpans) {
      s += evaluate(span.expression, typeChecker, scope);
      s += span.literal.text;
    }
  } else if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
    let bodyExpression: ts.Expression | undefined;
    if (ts.isBlock(expr.body)) {
      if (expr.body.statements.length > 1) {
        throw new Error('Cannot evaluate functions with more than one statement');
      }
      const statement = expr.body.statements[0];
      if (ts.isReturnStatement(statement)) {
        bodyExpression = statement.expression;
      } else {
        throw new Error('Cannot evaluate functions where the single statement is not a return statement');
      }
    } else {
      bodyExpression = expr.body;
    }
    const parameters: string[] = [];
    for (const parameter of expr.parameters) {
      if (ts.isIdentifier(parameter.name)) {
        parameters.push(parameter.name.text);
      } else {
        throw new Error('Static expressions does not support spread');
      }
    }

    return (...args: any[]) => {
      if (bodyExpression === undefined) {
        return undefined;
      }

      const parameterScope: { [argName: string]: any } = { ...scope };
      for (let i = 0; i < parameters.length; i++) {
        parameterScope[parameters[i]] = args[i];
      }
      return evaluate(bodyExpression, typeChecker, parameterScope);
    };
  } else if (ts.isCallExpression(expr)) {
    const callable = evaluate(expr.expression, typeChecker, scope) as Function;
    const args = [];
    for (const arg of expr.arguments) {
      const value = evaluate(arg, typeChecker, scope);
      args.push(value);
    }
    return callable.apply(null, args);
  } else if (ts.isIdentifier(expr)) {
    if (expr.text in scope) {
      return scope[expr.text];
    }

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
      return evaluate(symbol.valueDeclaration.initializer, typeChecker, scope);
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
  } else if (ts.isObjectLiteralExpression(expr)) {
    const obj: Object = {};
    for (const property of expr.properties) {
      let propertyName = '';
      if (property.name && ts.isIdentifier(property.name)) {
        propertyName = property.name.text;
      }
      if (property.name && ts.isComputedPropertyName(property.name)) {
        const value = evaluate(property.name.expression, typeChecker, scope);
        propertyName = value.toString();
      }
      let value: any = undefined;
      if (ts.isPropertyAssignment(property)) {
        value = evaluate(property.initializer, typeChecker, scope);
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        value = evaluate(property.name, typeChecker, scope);
      }

      obj[propertyName] = value;
    }
    return obj;
  } else if (ts.isArrayLiteralExpression(expr)) {
    const array: any[] = [];
    for (const element of expr.elements) {
      array.push(evaluate(element, typeChecker, scope));
    }
    return array;
  }
  throw new Error('Unable to evaluate expression, unsupported expression token kind: ' + expr.kind);
}
