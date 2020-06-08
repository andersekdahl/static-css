import compile from './compile';
import { generatedClassNames } from '../src';

type Code = { [fileName: string]: string };

beforeEach(() => {
  for (const key of Object.keys(generatedClassNames)) {
    delete generatedClassNames[key];
  }
});

test('can extract simple component', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';
function MyComponent(props: {}) {
    return <Styled>hello</Styled>;
}

const Styled = styledx.div({
    width: '100%',
    height: '100%'
});
`,
  };

  const expected = {
    'file1.jsx': `
function MyComponent(props) {
    return <div className="a0 a1">hello</div>;
}
`,
    'style.css': `
.a0 { width: '100%' }
.a1 { height: '100%' }
`,
  };

  expectEqual(expected, compile(code));
});

test('can extract derived component', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';
function MyComponent(props: {}) {
    return <DerivedStyled>hello</DerivedStyled>;
}

const Styled = styledx.div({
    width: '100%',
    height: '100%'
});

const DerivedStyled = styledx(Styled, {
  backgroundColor: 'black',
});
`,
  };

  const expected = {
    'file1.jsx': `
function MyComponent(props) {
    return <div className="a2 a0 a1">hello</div>;
}
`,
    'style.css': `
.a0 { width: '100%' }
.a1 { height: '100%' }
.a2 { backgroundColor: 'black' }
`,
  };

  expectEqual(expected, compile(code));
});

test('can use an inline component', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';
function MyComponent(props: {}) {
    return <styledx.Div css={{backgroundColor: 'black'}}>hello</styledx.Div>;
}
`,
  };

  const expected = {
    'file1.jsx': `
function MyComponent(props) {
    return <div className="a0">hello</div>;
}
`,
    'style.css': `
.a0 { backgroundColor: 'black' }
`,
  };

  expectEqual(expected, compile(code));
});

test('can use variables in style object', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';
const size = '100' + '%';
function MyComponent(props: {}) {
    return <styledx.Div css={{height: size}}>hello</styledx.Div>;
}
`,
  };

  const expected = {
    'file1.jsx': `
const size = '100' + '%';
function MyComponent(props) {
    return <div className="a0">hello</div>;
}
`,
    'style.css': `
.a0 { height: '100%' }
`,
  };

  expectEqual(expected, compile(code));
});

function expectEqual(expected: Code, compiled: Code) {
  Object.keys(expected).forEach((fileName) => {
    expect(fileName + ':\n' + compiled[fileName].trim().replace(/\r/g, '')).toBe(
      fileName + ':\n' + expected[fileName].trim().replace(/\r/g, ''),
    );
  });
}
