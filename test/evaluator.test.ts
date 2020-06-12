import { isRequiresRuntimeResult, RequiresRuntimeResult } from '../src/evaluator';
import evaluate from './evaluate';

test('can evaluate a variable', () => {
  const code = {
    'entry.ts': `
const x = 100;
`,
  };
  expect(evaluate('x', code)).toBe(100);
});

test('can reference other variables', () => {
  const code = {
    'entry.ts': `
const x = 100;
const y = x;
`,
  };
  expect(evaluate('y', code)).toBe(100);
});

test('can evaluate addition', () => {
  const code = {
    'entry.ts': `
const x = 100;
const y = x + 100;
`,
  };
  expect(evaluate('y', code)).toBe(100 + 100);
});

test('can evaluate subtraction', () => {
  const code = {
    'entry.ts': `
const x = 100;
const y = x - 100;
`,
  };
  expect(evaluate('y', code)).toBe(100 - 100);
});

test('can evaluate multiplication', () => {
  const code = {
    'entry.ts': `
const x = 100;
const y = x * 100;
`,
  };
  expect(evaluate('y', code)).toBe(100 * 100);
});

test('can evaluate division', () => {
  const code = {
    'entry.ts': `
const x = 100;
const y = x / 100;
`,
  };
  expect(evaluate('y', code)).toBe(100 / 100);
});

test('can evaluate string concat', () => {
  const code = {
    'entry.ts': `
const x = 'hello ';
const y = x + 'world';
`,
  };
  expect(evaluate('y', code)).toBe('hello world');
});

test('can evaluate string template', () => {
  const code = {
    'entry.ts': `
const x = 'hello';
const y = \`\${x} world\`;
`,
  };
  expect(evaluate('y', code)).toBe('hello world');
});

test('can evaluate a conditional', () => {
  const code = {
    'entry.ts': `
const one: number = 1;
const otherOne: number = 1;
const two: number = 2;
const otherTwo: number = 2;

const allTrue = one === one && 
                one === 1 &&
                one <= 1 &&
                one >= 1 &&
                one === otherOne &&
                !(one === two) &&
                one < two &&
                two > one;
`,
  };
  expect(evaluate('allTrue', code)).toBe(true);
});

test('can evaluate a function', () => {
  const code = {
    'entry.ts': `
const x = 1;
const y = 2;

function doSomething(z: number) {
  return z < 0 ? x : y;
}
`,
  };
  expect(evaluate('doSomething(-100)', code)).toBe(1);
  expect(evaluate('doSomething(100)', code)).toBe(2);
});

test('can evaluate a function in a different file', () => {
  const code = {
    'shared1.ts': `
const one = 1;
function calculator(a: number, b: number) {
  return a + b + one;
}
export { calculator };
export const oneHundred = 100;
export const twoHundred = 200;
`,
    'shared2.ts': `
export { calculator as theCalculator, oneHundred } from './shared1';
`,
    'shared3.ts': `
export { theCalculator } from './shared2';
import { oneHundred } from './shared2';
export const oneHundredExported = oneHundred;
`,
    'entry.ts': `
import { theCalculator, oneHundredExported } from './shared3';
import { twoHundred } from './shared1';
const x = oneHundredExported;
const y = twoHundred;
`,
  };
  expect(evaluate('theCalculator(x, y)', code)).toBe(100 + 200 + 1);
});

test('can use JS globals', () => {
  const code = {
    'entry.ts': `
const res = {
  x: String(1),
  z: Boolean('true'),
  u: Number('123'),
  y: Object.assign({x: 1}, {y: 2}),
}
`.trim(),
  };
  expect(evaluate('res', code)).toMatchObject({
    x: '1',
    z: true,
    u: 123,
    y: { x: 1, y: 2 },
  });
});

test('can inject variables', () => {
  const code = {
    'entry.ts': `
const y = window.innerHeight + 100;
`,
  };
  expect(evaluate('y', code, { window: { innerHeight: 100 } })).toBe(200);
});

test('can use rest args', () => {
  const code = {
    'entry.ts': `
const y = (...args: any[]) => args.join(', ');
const x = (arg1: any, ...args: any[]) => arg1 + ': ' + args.join(', ');
const z = y(1, 2, 3) + ', ' + x(1, 2, 3);
`,
  };
  expect(evaluate('z', code)).toBe('1, 2, 3, 1: 2, 3');
});

test('can use spread', () => {
  const code = {
    'entry.ts': `
const y = [1, ...[2, 3]];
const x = (...args: any[]) => args.join(', ');
const z = x(...y);
`,
  };
  expect(evaluate('z', code)).toBe('1, 2, 3');
});

test('can have functions with variables', () => {
  const code = {
    'entry.ts': `
const y = () => {
  const local = 1;
  return local + 1;
};

const x = () => {
  const local = 1;
  const localFunc = () => {
    const z = 1;
    return z + local;
  };
  return local + localFunc();
};
`,
  };
  expect(evaluate('y() + x()', code)).toBe(2 + 3);
});

test('values that are unknown at compile time gets reported correctly', () => {
  const code = {
    'entry.ts': `
const x = 'random value';
const z = 'other random value';
const u = 'some other random value';
const y = window.innerHeight + 100;
`.trim(),
  };
  const res = evaluate('y', code) as RequiresRuntimeResult;
  expect(isRequiresRuntimeResult(res)).toBe(true);
  const diagnostics = res.getDiagnostics();
  expect(diagnostics?.source).toBe('window');
  expect(diagnostics?.line).toBe(3);
  expect(diagnostics?.file).toBe('entry.ts');
});

test('can inject variables', () => {
  const code = {
    'entry.ts': `
const y = window.innerHeight + 100;
`,
  };
  expect(evaluate('y', code, { window: { innerHeight: 100 } })).toBe(200);
});
