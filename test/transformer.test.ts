import compile from './compile';

type Code = { [fileName: string]: string };

test('can extract simple component', () => {
  const code = {
    'colors.ts': `
export const black = '#' + '000';
const blue = 'blue';
export { blue as blueColor };
`,
    'file1.tsx': `
import { styledx } from './styledx';
import { black, blueColor } from './colors';

const height = '100%';
const myWidth = '10' + '0%';

function MyComponent(props: {}) {
    return (<div>
                <Styled>
                    hello
                </Styled>
                <styledx.Div css={{ backgroundColor: black }} />
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
    'colors.js': `
export const black = '#' + '000';
const blue = 'blue';
export { blue as blueColor };
`,
    'file1.jsx': `
import { black, blueColor } from './colors';
const height = '100%';
const myWidth = '10' + '0%';
function MyComponent(props) {
    return (<div>
                <div className="a1 a2 a3">
                    hello
                </div>
                <div className="a0"/>
                <div className="a1 a2">
                    hey!
                </div>
                <div className="a2 a1"/>
                <div className="a0 a1 a2 a3">heyoo</div>
            </div>);
}
`,
    'style.css': `
.a0 { backgroundColor: '#000' }
.a1 { width: '100%' }
.a2 { height: '100%' }
.a3 { color: 'blue' }
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
