const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;

export function u32(v) {
  let val = BigInt(v);
  const r = [];
  do {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    const cbit = val ? 128 : 0;
    r.push(b | cbit)
  } while (val)

  return r;
}

const CONTINUATION_BIT = 0b10000000;
export function i32(v) {
  let val = BigInt(v);
  const r = [];

  let more = true;
  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);

    val = val >> 7n;

    if ((val === 0n) || (val === -1n)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }

  return r;
}