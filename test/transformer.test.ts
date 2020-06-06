import compile from './compile';

type Code = { [fileName: string]: string };

test('can extract simple component', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';

function MyComponent(props: {}) {
    return (<div>
                <Styled>
                    hello
                </Styled>
                <styledx.Div css={{ backgroundColor: 'black' }} />
                <styledx.Div css={{ width: '100%', height: '100%' }}>
                    hey!
                </styledx.Div>
                <StyledSelfClosing />
            </div>);
}

const Styled = styledx.div({
    width: '100%',
    height: '100%',
});

const StyledSelfClosing = styledx.div({
  height: '100%',
  width: '100%',
});
`,
  };

  const expected = {
    'file1.jsx': `
function MyComponent(props) {
    return (<div>
                <div className="a a">
                    hello
                </div>
                <div className="a"/>
                <div className="a a">
                    hey!
                </div>
                <div className="a a"/>
            </div>);
}
`,
  };

  expectEqual(expected, compile(code));
});

function expectEqual(expected: Code, compiled: Code) {
  Object.keys(expected).forEach((fileName) => {
    expect(fileName + ':\n' + compiled[fileName].trim()).toBe(fileName + ':\n' + expected[fileName].trim());
  });
}
