class Value {
  constructor(value) {
    this.value = value
  }

  getTypeName() {
    throw new Exception('Not implemented')
  }

  applyUnOp(fn) {
    return new this.constructor(fn(this.value))
  }
}

class ModuleInstance {
  constructor() {
    this.pc = 0
    this.opC = 0

    this.stack = []

    this.c = null
    this.c1 = null
    this.c2 = null
  }

  pushValue(val) {
    this.stack.push(val)
  }

  popValue() {
    return this.stack.pop()
  }

  pushC() {
    this.pushValue(this.c)
  }

  popValueIntoC1() {
    this.c1 = this.popValue()
  }

  popValueIntoC2() {
    this.c2 = this.popValue()
  }

  peekValue() {
    return this.stack.at(-1)
  }

  assertTopValueOfType(Class) {
    return this.peekValue() instanceof Class
  }

  applyUnOp(fn) {
    this.c = this.c1.applyUnOp(fn)
  }

  step(code) {
    if (this.pc >= code.length) {
      return
    }

    const instr = code[this.pc]

    if (this.opC < instr.ops.length) {
      const op = instr.ops[this.opC]
      op.run(this)
    }

    this.opC += 1
    if (this.opC >= instr.ops.length) {
      this.pc += 1
      this.opC = 0
    }
  }
}

class Instruction {
  constructor(name, ops) {
    this.name = name
    this.ops = ops
  }
}

class Op {
  constructor(name, fn) {
    this.name = name
    this.fn = fn
  }

  run(vm) {
    this.fn(vm)
  }
}

class ConstOp extends Op {
  constructor(name, value) {
    super(name, (vm) => vm.pushValue(value))
  }
}

class Module {
  constructor(code) {
    this.code = code
  }
}

class I32 extends Value {
  getTypeName() {
    return 'i32'
  }
}

function i32(v) {
  return new I32(v)
}

const nop = new Instruction('nop', [])

const ASSERT_TOP_I32 = new Op('Assert Value Type i32', (vm) =>
  vm.assertTopValueOfType(I32),
)
const PUSH_C = new Op('Push c', vm => vm.pushC())
const POP_TO_C1 = new Op('Pop to c1', (vm) => vm.popValueIntoC1())
const APPLY_UN_OP = (opName, fn) => 
  new Op(`Apply UnOp: ${opName}`, vm => vm.applyUnOp(fn))

i32.const = (v) =>
  new Instruction(`i32.const`, [new ConstOp(`Push value ${v}`, i32(v))]);
i32.eqz = new Instruction(`i32.eqz`, [
  ASSERT_TOP_I32,
  POP_TO_C1,
  APPLY_UN_OP('eqz', c1 => c1 === 0 ? 1 : 0),
  PUSH_C
])




