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

test.only('can evaluate string template', () => {
  const code = {
    'entry.ts': `
const x = 'hello';
const y = \`\${x} world\`;
`,
  };
  expect(evaluate('y', code)).toBe('hello world');
});
