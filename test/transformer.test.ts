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

test('can extract simple component1', () => {
  const code = {
    'shared.ts': `
export const black = '#' + '000';
const blue = 'blue';
export { blue as blueColor };

export enum Unit {
  Px,
  Em,
  Rem,
}

export function pixelsToUnit(value: number, unit: Unit) {
  return unit === Unit.Px ? value + 'px' : value + (unit === Unit.Rem ? 'rem' : 'em');
}
`,
    'file1.tsx': `
import { styledx } from './styledx';
import { black, blueColor, pixelsToUnit, Unit } from './shared';

const calcHeight = (base: number) => base * 10;

const height = calcHeight(10) + '%';
const myWidth = '10' + '0%';

function MyComponent(props: {}) {
    return (<div>
                <Styled>
                    hello
                </Styled>
                <styledx.Div css={{ backgroundColor: black, lineHeight: pixelsToUnit(10, Unit.Em) }} />
                <styledx.Div css={{ width: '100%', height: '100%' }}>
                    hey!
                </styledx.Div>
                <StyledSelfClosing />
                <Derived>heyoo</Derived>
            </div>);
}

const Styled = styledx.div({
    width: myWidth,
    height,
    color: blueColor,
});

const Derived = styledx(Styled, {
    backgroundColor: black,
});

const StyledSelfClosing = styledx.div({
    height: '100%',
    width: '100%',
});
`,
  };

  const expected = {
    'file1.jsx': `
import { black, blueColor, pixelsToUnit, Unit } from './shared';
const calcHeight = (base) => base * 10;
const height = calcHeight(10) + '%';
const myWidth = '10' + '0%';
function MyComponent(props) {
    return (<div>
                <div className="a2 a3 a4">
                    hello
                </div>
                <div className="a0 a1"/>
                <div className="a2 a3">
                    hey!
                </div>
                <div className="a3 a2"/>
                <div className="a0 a2 a3 a4">heyoo</div>
            </div>);
}
`,
    'style.css': `
.a0 { backgroundColor: '#000' }
.a1 { lineHeight: '10em' }
.a2 { width: '100%' }
.a3 { height: '100%' }
.a4 { color: 'blue' }
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
