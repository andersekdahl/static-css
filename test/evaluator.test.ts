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
