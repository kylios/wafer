import { u32, i32 } from './types.js'

export const SECTION_ID_TYPE = 1;
export const SECTION_ID_IMPORT = 2
export const SECTION_ID_FUNCTION = 3;
export const SECTION_ID_EXPORT = 7;
export const SECTION_ID_CODE = 10;

const TYPE_FUNCTION = 0x60;

const instr = {
  nop: 0x01,
  end: 0x0b,
  call: 0x10,
  if: 0x04,
  else: 0x05,
  drop: 0x1a,
  block: 0x02,
  loop: 0x03,
  br: 0x0c,
  br_if: 0x0d,

  i32: {
    const: 0x41,
    eq: 0x46, // a == b
    ne: 0x47, // a != b
    lt_s: 0x48, // a < b (signed)
    lt_u: 0x49, // a < b (unsigned)
    gt_s: 0x4a, // a > b (signed)
    gt_u: 0x4b, // a > b (unsigned)
    le_s: 0x4c, // a <= b (signed)
    le_u: 0x4d, // a <= b (unsigned)
    ge_s: 0x4e, // a >= b (signed)
    ge_u: 0x4f, // a >= b (unsigned)
    eqz: 0x45, // a == 0
    and: 0x71,
    or: 0x72,

    add: 0x6a,
    sub: 0x6b,
    mul: 0x6c,
    div_s: 0x6d,
  },
  f32: {
    const: 0x43,
  },
  i64: {
    const: 0x42,
    add: 0x7c,
  },
  f64: {
    const: 0x44,
  },
  local: {
    get: 0x20,
    set: 0x21,
    tee: 0x22,
  }
}
const labelidx = u32
const funcidx = u32
const typeidx = u32
const localidx = u32

const valtype = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
}

const blocktype = {
  empty: 0x40,
  ...valtype
}

function stringToBytes(s) {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

function int32ToBytes(v) {
  return [
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >> 24) & 0xff,
  ];
}

function magic() {
  return stringToBytes('\0asm')
}

function version() {
  return int32ToBytes(1)
}

function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

function module(sections) {
  return [magic(), version(), sections];
}

function vec(elements) {
  return [u32(elements.length), ...elements];
}

function name(s) {
  return vec(stringToBytes(s));
}

function export_(nm, exportdesc) {
  return [name(nm), exportdesc];
}

// mod:name  nm:name  d:importdesc
function import_(mod, nm, d) {
  return [name(mod), name(nm), d];
}

function code(func) {
  const sizeInBytes = func.flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

function func(locals, body) {
  return [vec(locals), body];
}

function locals(n, type) {
  return [u32(n), type];
}

function functype(paramTypes, resultTypes) {
  return [TYPE_FUNCTION, vec(paramTypes), vec(resultTypes)];
}

function typesec(functypes) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

// im*:vec(import)
function importsec(ims) {
  return section(SECTION_ID_IMPORT, vec(ims));
}

function exportsec(exports) {
  return section(SECTION_ID_EXPORT, vec(exports));
}

function codesec(codes) {
  return section(SECTION_ID_CODE, vec(codes));
}

const exportdesc = {
  func(idx) {
    return [0x00, funcidx(idx)];
  },
};

const importdesc = {
  // x:typeidx
  func(x) {
    return [0x00, typeidx(x)];
  },
}

export {
  code,
  codesec,
  export_,
  import_,
  exportdesc,
  importdesc,
  importsec,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  instr,
  module,
  name,
  section,
  typeidx,
  localidx,
  labelidx,
  typesec,
  valtype,
  vec,
  locals,
  blocktype
}