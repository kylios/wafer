export const waferPrelude = `
  func newInt32Array(len) {
    let freeOffset = __mem[__heap_base];
    __mem[__heap_base] := freeOffset + (len * 4) + 5;
    __mem[freeOffset] := len;
    freeOffset
  }

  func __readInt32Array(arr, idx) {
    if idx < 0 or idx >= __mem[arr] {
      __trap();
    }
    __mem[arr + 4 + (4 * idx)]
  }

  func __writeInt32Array(arr, idx, val) {
    if idx < 0 or idx >= __mem[arr] {
      __trap();
    }
    __mem[arr + 4 + (4 * idx)] := val
  }
`;