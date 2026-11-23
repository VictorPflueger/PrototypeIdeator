// A small report for the Node suites: check(ok, what) records a result, finish(token) prints every
// result as PASS or FAIL, exits 1 if any failed, and prints the suite's success token only when all
// passed. Each suite also proves its checks can fail with a planted control (control(ok, what)).

export function createReport(name) {
  const results = [];
  const controls = [];
  return {
    check(ok, what) { results.push([!!ok, what]); return !!ok; },
    control(ok, what) { controls.push([!!ok, `control: ${what}`]); return !!ok; },
    finish(token) {
      const all = [...controls, ...results];
      for (const [ok, what] of all) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
      const failed = all.filter(([ok]) => !ok).length;
      if (!all.length) { console.log(`\n${name}: no checks ran.`); process.exit(1); }
      if (failed) { console.log(`\n${name}: ${failed} of ${all.length} checks failed.`); process.exit(1); }
      console.log(`\n${name}: all ${all.length} checks passed.\n${token}`);
    }
  };
}

/** Deep equality through JSON, for plain data. */
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
