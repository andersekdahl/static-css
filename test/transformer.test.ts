import compile from './compile';

type Code = { [fileName: string]: string };

test('can extract simple component', () => {
  const code = {
    'file1.ts': `
import { styledx } from './styledx';
const Field = styledx.div({
  width: '100%',
  height: '100%',
});
`,
  };

  const expected = {
    'file1.js': `
const Field = <div className="a a"/>;
`,
  };

  expectEqual(expected, compile(code));
});

function expectEqual(expected: Code, compiled: Code) {
  Object.keys(expected).forEach((fileName) => {
    expect(fileName + ':\n' + compiled[fileName].trim()).toBe(fileName + ':\n' + expected[fileName].trim());
  });
}
