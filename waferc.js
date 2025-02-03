import * as fs from 'node:fs'
import {basename, dirname, extname, join} from 'node:path';
import { compile } from './lib/lang.js'

function main() {
  const filePath = process.argv[process.argv.length - 1]
  const ext = extname(filePath);
  if (!filePath || ext !== '.wafer') {
    console.error('Usage: node waferc.js </path/to/file.wafer>');
    process.exit(1);
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const outputPath = join(dirname(filePath), basename(filePath, ext) + '.wasm');
    fs.writeFileSync(outputPath, compile(data))
  } catch (err) {
    console.error(err);
  }
}

main()