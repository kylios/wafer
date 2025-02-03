import process from 'node:process'
import assert from 'node:assert'
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {default as nodeTest} from 'node:test'
import * as ohm from 'ohm-js';
import {extractExamples} from 'ohm-js/extras'

function makeTestFn(url) {
  const runTests = process.env.NODE_TEST_CONTEXT != null;
  if (runTests) {
    // Register the test normally.
    return (testName, ...args) => {
      const filename = basename(url, '.js');
      nodeTest(`[${filename}] ${testName}`, ...args);
    };
  }
  return () => {}; // Ignore the test.
}

export const test = makeTestFn(import.meta.url)

export function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.strictEqual(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}