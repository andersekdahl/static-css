import * as ts from 'typescript';

export function evaluate(
  expr: ts.Expression | ts.FunctionDeclaration | ts.EnumDeclaration,
  typeChecker: ts.TypeChecker,
  scope: { [name: string]: any },
): any {
  if (ts.isBinaryExpression(expr)) {
    const left = evaluate(expr.left, typeChecker, scope);
    if (isRequiresRuntimeResult(left)) {
      return left;
    }

    const right = evaluate(expr.right, typeChecker, scope);
    if (isRequiresRuntimeResult(right)) {
      return right;
    }

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
  } else if (ts.isParenthesizedExpression(expr)) {
    return evaluate(expr.expression, typeChecker, scope);
  } else if (ts.isConditionalExpression(expr)) {
    const condition = evaluate(expr.condition, typeChecker, scope);
    if (isRequiresRuntimeResult(condition)) {
      return condition;
    }
    const whenTrue = evaluate(expr.whenTrue, typeChecker, scope);
    if (isRequiresRuntimeResult(whenTrue)) {
      return whenTrue;
    }
    if (condition) {
      return whenTrue;
    }

    const whenFalse = evaluate(expr.whenFalse, typeChecker, scope);
    if (isRequiresRuntimeResult(whenFalse)) {
      return whenFalse;
    }
    return whenFalse;
  } else if (ts.isPrefixUnaryExpression(expr)) {
    if (expr.operator == ts.SyntaxKind.PlusPlusToken || expr.operator == ts.SyntaxKind.MinusMinusToken) {
      return requiresRuntimeResult('-- or ++ expressions are not supported', expr);
    }
    const value = evaluate(expr.operand, typeChecker, scope);
    if (isRequiresRuntimeResult(value)) {
      return value;
    }
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
    if (isRequiresRuntimeResult(obj)) {
      return obj;
    }
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = expr.name.escapedText.toString();
    return obj[property];
  } else if (ts.isElementAccessExpression(expr)) {
    const obj = evaluate(expr.expression, typeChecker, scope);
    if (isRequiresRuntimeResult(obj)) {
      return obj;
    }
    if (!obj && expr.questionDotToken) {
      return undefined;
    }
    const property = evaluate(expr.argumentExpression, typeChecker, scope);
    if (isRequiresRuntimeResult(property)) {
      return property;
    }
    return obj[property];
  } else if (ts.isTaggedTemplateExpression(expr)) {
    return requiresRuntimeResult('Tagged templates are not supported', expr);
  } else if (ts.isTemplateExpression(expr)) {
    let s = expr.head.text;
    for (const span of expr.templateSpans) {
      const value = evaluate(span.expression, typeChecker, scope);
      if (isRequiresRuntimeResult(value)) {
        return value;
      }
      s += value;
      s += span.literal.text;
    }
    return s;
  } else if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr) || ts.isFunctionDeclaration(expr)) {
    let bodyExpression: ts.Expression | undefined;
    if (expr.body) {
      if (ts.isBlock(expr.body)) {
        if (expr.body.statements.length > 1) {
          return requiresRuntimeResult('Cannot evaluate functions with more than one statement', expr);
        }
        const statement = expr.body.statements[0];
        if (ts.isReturnStatement(statement)) {
          bodyExpression = statement.expression;
        } else {
          return requiresRuntimeResult(
            'Cannot evaluate functions where the single statement is not a return statement',
            expr,
          );
        }
      } else {
        bodyExpression = expr.body;
      }
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
    if (isRequiresRuntimeResult(callable)) {
      return callable;
    }
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
      symbol = resolveImportSymbol(expr.text, symbol, typeChecker);
    }
    if (!symbol.valueDeclaration) {
      return requiresRuntimeResult('Unable to find the value declaration of imported symbol', expr);
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
    if (ts.isFunctionDeclaration(symbol.valueDeclaration)) {
      return evaluate(symbol.valueDeclaration, typeChecker, scope);
    }
    if (ts.isEnumDeclaration(symbol.valueDeclaration)) {
      return evaluate(symbol.valueDeclaration, typeChecker, scope);
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
        if (isRequiresRuntimeResult(value)) {
          return value;
        }
        propertyName = value.toString();
      }
      let value: any = undefined;
      if (ts.isPropertyAssignment(property)) {
        value = evaluate(property.initializer, typeChecker, scope);
        if (isRequiresRuntimeResult(value)) {
          return value;
        }
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        value = evaluate(property.name, typeChecker, scope);
        if (isRequiresRuntimeResult(value)) {
          return value;
        }
      }

      obj[propertyName] = value;
    }
    return obj;
  } else if (ts.isArrayLiteralExpression(expr)) {
    const array: any[] = [];
    for (const element of expr.elements) {
      const value = evaluate(element, typeChecker, scope);
      if (isRequiresRuntimeResult(value)) {
        return value;
      }
      array.push(value);
    }
    return array;
  } else if (ts.isEnumDeclaration(expr)) {
    const enm: Object = {};
    let i = 0;
    for (const member of expr.members) {
      let memberName: string;
      if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name)) {
        memberName = member.name.text;
      } else if (ts.isComputedPropertyName(member.name)) {
        const value = evaluate(member.name.expression, typeChecker, scope);
        if (isRequiresRuntimeResult(value)) {
          return value;
        }
        memberName = value.toString();
      } else {
        throw new Error('Unsupported enum declaration');
      }
      if (!member.initializer) {
        enm[memberName] = i;
        enm[i] = memberName;
      } else {
        const value = evaluate(member.initializer, typeChecker, scope);
        if (isRequiresRuntimeResult(value)) {
          return value;
        }
        enm[memberName] = value;
      }
      i++;
    }
    return enm;
  }
  throw new Error('Unable to evaluate expression, unsupported expression token kind: ' + expr.kind);
}

function resolveImportSymbol(variableName: string, symbol: ts.Symbol, typeChecker: ts.TypeChecker) {
  if (!symbol.valueDeclaration) {
    const importSpecifier = symbol.declarations[0];
    if (ts.isImportSpecifier(importSpecifier)) {
      const x = importSpecifier.parent;
      const importSymbol = typeChecker.getSymbolAtLocation(x.parent.parent.moduleSpecifier);
      if (importSymbol) {
        const exports = typeChecker.getExportsOfModule(importSymbol);
        for (const exp of exports) {
          if (exp.escapedName === variableName) {
            symbol = exp;
            break;
          }
        }
      }
    }
  }
  if (!symbol.valueDeclaration) {
    const exportSpecifier = symbol.declarations[0];
    if (ts.isExportSpecifier(exportSpecifier)) {
      const variableToLookFor = exportSpecifier.propertyName?.text ?? exportSpecifier.name.text;
      const x = exportSpecifier.parent;

      if (x.parent.moduleSpecifier) {
        const importSymbol = typeChecker.getSymbolAtLocation(x.parent.moduleSpecifier);
        if (importSymbol) {
          const exports = typeChecker.getExportsOfModule(importSymbol);
          for (const exp of exports) {
            if (exp.escapedName === variableToLookFor) {
              if (!exp.valueDeclaration) {
                symbol = resolveImportSymbol(variableToLookFor, exp, typeChecker);
              } else {
                symbol = exp;
              }
              break;
            }
          }
        }
      } else {
        const local = typeChecker.getExportSpecifierLocalTargetSymbol(exportSpecifier);
        if (local) {
          symbol = local;
        }
      }
    }
  }
  return symbol;
}

export type RequiresRuntimeResult = {
  __requiresRuntime: true;
  message: string;
  node?: ts.Node;
};

function requiresRuntimeResult(message: string, node?: ts.Node): RequiresRuntimeResult {
  return {
    __requiresRuntime: true,
    message,
    node,
  };
}

export function isRequiresRuntimeResult(o: unknown): o is RequiresRuntimeResult {
  if (!o || typeof o !== 'object') {
    return false;
  }
  const res = o as RequiresRuntimeResult;
  return res.__requiresRuntime === true;
}
