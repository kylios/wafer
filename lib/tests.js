function makeTestFn(url) {
  const runTests = process.env.NODE_TEST_CONTEXT != null;
  if (runTests && process.argv[1] === fileURLToPath(url)) {
    // Register the test normally.
    return (testName, ...args) => {
      const filename = basename(url, '.js');
      nodeTest(`[${filename}] ${testName}`, ...args);
    };
  }
  return () => {}; // Ignore the test.
}

export const test = makeTestFn(import.meta.url)