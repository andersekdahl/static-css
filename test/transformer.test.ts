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
import { styled } from '@glitz/react';
function MyComponent(props: {}) {
    return <Styled>hello</Styled>;
}

const Styled = styled.div({
    width: '100%',
    height: '100%'
});
`,
  };

  const expected = {
    'file1.jsx': `
import { styled } from '@glitz/react';
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
import { styled } from '@glitz/react';
function MyComponent(props: {}) {
    return <DerivedStyled>hello</DerivedStyled>;
}

const Styled = styled.div({
    width: '100%',
    height: '100%'
});

const DerivedStyled = styled(Styled, {
  backgroundColor: 'black',
});
`,
  };

  const expected = {
    'file1.jsx': `
import { styled } from '@glitz/react';
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
import { styled } from '@glitz/react';
function MyComponent(props: {}) {
    return <styled.Div css={{backgroundColor: 'black'}}>hello</styled.Div>;
}
`,
  };

  const expected = {
    'file1.jsx': `
import { styled } from '@glitz/react';
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
import { styled } from '@glitz/react';
const size = '100' + '%';
function MyComponent(props: {}) {
    return <styled.Div css={{height: size}}>hello</styled.Div>;
}
`,
  };

  const expected = {
    'file1.jsx': `
import { styled } from '@glitz/react';
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

test.only('it bails when it finds a variable that can not be statically evaluated', () => {
  const code = {
    'file1.tsx': `
import { styled } from '@glitz/react';
function MyComponent(props: {}) {
    return <styled.Div css={{ height: window.innerHeight }}><DerivedStyled /></styled.Div>;
}

const Styled = styled.div({
    width: '100%',
    height: window.innerHeight + 'px',
});

const DerivedStyled = styled(Styled, {
    backgroundColor: 'black',
});
`,
  };

  const expected = {
    'file1.jsx': `
import { styled } from '@glitz/react';
function MyComponent(props) {
    return <styled.Div css={{ height: window.innerHeight }}><DerivedStyled /></styled.Div>;
}
const Styled = styled.div({
    width: '100%',
    height: window.innerHeight + 'px',
});
const DerivedStyled = styled(Styled, {
    backgroundColor: 'black',
});
`,
    'style.css': ``,
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
