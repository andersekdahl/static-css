import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import transformer, { styledName, generatedClassNames } from '../src/';

export default function compile(files: { [fileName: string]: string }) {
  files['@glitz/react.ts'] = `
export const styled = (...args: any[]) => null;
styled.div = (args: any) => null;
styled.Div = (props: any) => null;
`;

  const outputs: { [fileName: string]: string } = {};

  const compilerOptions: ts.CompilerOptions = {
    noEmitOnError: true,
    target: ts.ScriptTarget.Latest,
    jsx: ts.JsxEmit.Preserve,
  };

  const compilerHost: ts.CompilerHost = {
    getSourceFile(filename, languageVersion) {
      if (filename in files) {
        return ts.createSourceFile(filename, files[filename], ts.ScriptTarget.Latest);
      }
      if (filename.indexOf('.d.ts') !== -1) {
        return ts.createSourceFile(
          filename,
          fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'typescript', 'lib', filename)).toString(),
          ts.ScriptTarget.Latest,
        );
      }
      console.log('TS asked for file', filename, 'but that was not passed in to the compile function');
      return undefined;
    },
    readFile(fileName: string) {
      return fileName;
    },
    fileExists(fileName: string) {
      return true;
    },
    getDefaultLibFileName(options: ts.CompilerOptions) {
      return 'lib.d.ts';
    },
    writeFile: function(fileName, data, writeByteOrderMark) {
      if (!fileName.includes(styledName)) {
        outputs[fileName] = data;
      }
    },
    getDirectories(path: string) {
      return null as any;
    },
    useCaseSensitiveFileNames: function() {
      return false;
    },
    getCanonicalFileName: function(filename) {
      return filename;
    },
    getCurrentDirectory: function() {
      return '';
    },
    getNewLine: function() {
      return '\n';
    },
  };

  const program = ts.createProgram(Object.keys(files), compilerOptions, compilerHost);
  const transformers: ts.CustomTransformers = {
    before: [transformer(program)],
    after: [],
  };

  const writeFileCallback: ts.WriteFileCallback = (fileName: string, data: string) => {
    outputs[fileName] = data;
  };
  const { emitSkipped, diagnostics } = program.emit(undefined, writeFileCallback, undefined, false, transformers);

  if (emitSkipped) {
    throw new Error(diagnostics.map((diagnostic) => diagnostic.messageText).join('\n'));
  }

  let css = '';
  for (const mediaQuery of Object.keys(generatedClassNames)) {
    if (!mediaQuery) {
      css +=
        Object.keys(generatedClassNames[mediaQuery])
          .map((c) => `.${generatedClassNames[mediaQuery][c]} { ${c} }`)
          .join('\n') + '\n';
    } else {
      css += `${mediaQuery} {\n  `;
      css +=
        Object.keys(generatedClassNames[mediaQuery])
          .map((c) => `.${generatedClassNames[mediaQuery][c]} { ${c} }`)
          .join('\n  ') + '\n}\n';
    }
  }

  outputs['style.css'] = css.trim();

  return outputs;
}
