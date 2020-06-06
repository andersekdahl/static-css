import compile from './compile';

type Code = { [fileName: string]: string };

test('can extract simple component', () => {
  const code = {
    'file1.tsx': `
import { styledx } from './styledx';

function MyComponent(props: {}) {
    return <div><Styled>hello</Styled></div>;
}

const Styled = styledx.div({
    width: '100%',
    height: '100%',
});
`,
  };

  const expected = {
    'file1.jsx': `
function MyComponent(props) {
    return <div><div className="a a">hello</div></div>;
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
