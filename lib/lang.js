import * as ohm from 'ohm-js';
import assert from 'node:assert';
import { test } from './tests.js'
import {
  int32ToBytes,
  instr, locals, limits,
  valtype, blocktype, functype, memtype,
  localidx, labelidx, funcidx, typeidx, memidx,
  import_, export_,
  code, func, module, mem, memarg, data,
  typesec, funcsec, importsec, exportsec, codesec, memsec, datasec,
  importdesc, exportdesc,
  i32, u32,
} from './wasm.js'
import { waferPrelude } from './prelude.js'
import { testExtractedExamples } from './tests.js';
import { print } from './dbg.js'

const grammarDef = String.raw`
  Wafer {
    Module = (FunctionDecl|ExternFunctionDecl)*

    Statement = LetStatement
              | IfStatement
              | WhileStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = let identifier "=" Expr ";"

    //+ "if x < 10 {}", "if z { 42; }", "if x {} else if y {} else { 42; }"
    //- "if x < 10 { 3 } else {}"
    IfStatement = if Expr BlockStatements (else (BlockStatements|IfStatement))?

    //+ "while 0 {}", "while x < 10 { x := x + 1; }"
    //- "while 1 { 42 }", "while x < 10 { x := x + 1 }"
    WhileStatement = while Expr BlockStatements

    //+ "func zero() { 0 }", "func add(x, y) { x + y }"
    //- "func x", "func x();"
    FunctionDecl = func identifier "(" Params? ")" BlockExpr

    //+ "extern func print(x);"
    ExternFunctionDecl = extern func identifier "(" Params? ")" ";"
    Params = identifier ("," identifier)*

    //+ "{ 42 }", "{ 66 + 99 }", "{ 1 + 2 - 3 }"
    //+ "{ let x = 3; 42 }"
    //- "{ 3abc }"
    BlockExpr = "{" Statement* Expr "}"

    //+ "{}", "{ let x = 3; }", "{ 42; 99; }"
    //- "{ 42 }", "{ x := 1 }"
    BlockStatements = "{" Statement* "}"

    ExprStatement = Expr ";"

    Expr = AssignmentExpr  -- assignment
          | PrimaryExpr (binaryOp PrimaryExpr)*  -- binary

    //+ "x := 3", "y := 2 + 1"
    AssignmentExpr = identifier ":=" Expr -- var
                   | identifier "[" Expr "]" ":=" Expr  -- array

    PrimaryExpr = "(" Expr ")"  -- paren
                | number
                | stringLiteral
                | CallExpr
                | identifier "[" Expr "]"  -- index
                | identifier  -- var
                | IfExpr

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    //+ "if x { 42 } else { 99 }", "if x { 42 } else if y { 99 } else { 0 }"
    //- "if x { 42 }"
    IfExpr = if Expr BlockExpr else (BlockExpr|IfExpr)

    binaryOp = "+" | "-" | "*" | "/" | compareOp | logicalOp
    compareOp = "==" | "!=" | "<=" | "<" | ">=" | ">"
    logicalOp = and | or
    number = digit+

    keyword = if | else | func | let | while | and | or | extern
    if = "if" ~identPart
    else = "else" ~identPart
    func = "func" ~identPart
    let = "let" ~identPart
    while = "while" ~identPart
    and = "and" ~identPart
    or = "or" ~identPart
    extern = "extern" ~identPart

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = ~keyword identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    stringLiteral = quote (~quote any)* quote
    quote = "\""
    
    space += singleLineComment | multiLineComment
    singleLineComment = "//" (~"\n" any)*
    multiLineComment = "/*" (~"*/" any)* "*/"

    // Examples:
    //+ "func addOne(x) { x + one }", "func one() { 1 } func two() { 2 }"
    //- "42", "let x", "func x {}"
  }
`;

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

function buildModule(importDecls, functionDecls, dataSegments = []) {
  const types = [...importDecls, ...functionDecls].map((f) =>
    functype(f.paramTypes, [f.resultType]),
  );
  console.log('types: ', types)
  const imports = importDecls.map((f, i) =>
    import_(f.module, f.name, importdesc.func(i)),
  );
  const funcs = functionDecls.map((f, i) => typeidx(i + importDecls.length));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i + importDecls.length)),
  );
  exports.push(export_('$waferMemory', exportdesc.mem(0)));

  const ds = datasec(
      dataSegments.map(
        seg => data(
          memidx(0),
          [[instr.i32.const, i32(seg.offset)], instr.end],
          seg.bytes
        )
      )
  )
  console.log(ds)
    

  const mod = module([
    typesec(types),
    importsec(imports),
    funcsec(funcs),
    memsec([mem(memtype(limits.min(1)))]),
    exportsec(exports),
    codesec(codes),
    ds
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule with imports', () => {
  const importDecls = [
    {
      module: 'basicMath',
      name: 'addOne',
      paramTypes: [valtype.i32],
      resultType: valtype.i32,
    },
  ];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [instr.i32.const, i32(42), instr.call, funcidx(0), instr.end],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls), {
    basicMath: {addOne: (x) => x + 1},
  });
  assert.strictEqual(exports.main(), 43);
});

function loadMod(bytes, imports) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod, imports).exports;
}

function resolveSymbol(identNode, locals) {
  const identName = identNode.sourceString;
  if (locals.has(identName)) {
    return locals.get(identName);
  }
  throw new Error(`Error: undeclared identifier '${identName}'`);
}

function defineFunctionDecls(semantics, symbols) {
  semantics.addOperation('functionDecls', {
    _default(...children) {
      return children.flatMap((c) => c.functionDecls());
    },
    FunctionDecl(_func, ident, _l, _params, _r, _blockExpr) {
      const name = ident.sourceString;
      const localVars = Array.from(symbols.get(name).values());
      const params = localVars.filter((info) => info.what === 'param');
      const paramTypes = params.map((_) => valtype.i32);
      const varsCount = localVars.filter(
        (info) => info.what === 'local',
      ).length;
      return [
        {
          name,
          paramTypes,
          resultType: valtype.i32,
          locals: [locals(varsCount, valtype.i32)],
          body: this.toWasm(),
        },
      ];
    },
  });
}

function defineImportDecls(semantics) {
  semantics.addOperation('importDecls', {
    _default(...children) {
      return children.flatMap((c) => c.importDecls());
    },
    ExternFunctionDecl(_extern, _func, ident, _l, optParams, _r, _) {
      const name = ident.sourceString;
      const paramTypes =
        optParams.numChildren === 0 ? [] : getParamTypes(optParams.child(0));
      return [
        {
          module: 'waferImports',
          name,
          paramTypes,
          resultType: valtype.i32,
        },
      ];
    },
  });
}

function getParamTypes(node) {
  assert.strictEqual(node.ctorName, 'Params', 'Wrong node type');
  assert.strictEqual(node.numChildren, 3, 'Wrong number of children');
  const [first, _, iterRest] = node.children;
  return new Array(iterRest.numChildren + 1).fill(valtype.i32);
}

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const scopes = [new Map()];
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    ExternFunctionDecl(_extern, _func, ident, _l, optParams, _r, _) {
      const name = ident.sourceString;
      scopes.at(-1).set(name, new Map());
    },
    FunctionDecl(_func, ident, _lparen, optParams, _rparen, blockExpr) {
      const name = ident.sourceString;
      const locals = new Map();
      scopes.at(-1).set(name, locals);
      scopes.push(locals);
      optParams.child(0)?.buildSymbolTable();
      blockExpr.buildSymbolTable();
      scopes.pop();
    },
    Params(ident, _, iterIdent) {
      for (const id of [ident, ...iterIdent.children]) {
        const name = id.sourceString;
        const idx = scopes.at(-1).size;
        const info = {name, idx, what: 'param'};
        scopes.at(-1).set(name, info);
      }
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = scopes.at(-1).size;
      const info = {name, idx, what: 'local'};
      scopes.at(-1).set(name, info);
    },
    AssignmentExpr_array(_id, _lbracket, _idx, _rbracket, _, _expr) {
      const name = '$temp';
      if (!scopes.at(-1).has(name)) {
        const idx = scopes.at(-1).size;
        const info = {name, idx, what: 'local'};
        scopes.at(-1).set(name, info);
      }
    },
  });
  tempSemantics(matchResult).buildSymbolTable();
  return scopes[0];
}

function stringLiteralBytes(str) {
  const bytes = int32ToBytes(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes.push(...int32ToBytes(str.charCodeAt(i)));
  }
  assert.strictEqual(bytes.length, (str.length + 1) * 4, str);
  return bytes;
}

function buildStringTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const table = {
    offsets: new Map(),
    data: [],
  };
  tempSemantics.addOperation('buildStringTable', {
    _default(...children) {
      return children.forEach((c) => c.buildStringTable());
    },
    stringLiteral(_lquote, chars, _rquote) {
      const str = chars.sourceString;
      const offset = table.data.length;
      table.offsets.set(str, offset);
      table.data.push(...stringLiteralBytes(str));
    },
  });
  tempSemantics(matchResult).buildStringTable();
  return table;
}

function defineToWasm(semantics, symbols, stringTable) {
  const scopes = [symbols];

  const functionCall = (name) => {
    if (name === '__trap') {
      return [instr.unreachable]
    }
    const funcNames = Array.from(scopes[0].keys());
    const idx = funcNames.indexOf(name);
    assert(idx >= 0, `no such function '${name}'`);
    return [instr.call, funcidx(idx)];
  }

  semantics.addOperation('toWasm', {
    FunctionDecl(_func, ident, _lparen, optParams, _rparen, blockExpr) {
      scopes.push(symbols.get(ident.sourceString));
      const result = [blockExpr.toWasm(), instr.end];
      scopes.pop();
      return result;
    },
    BlockExpr(_lbrace, iterStatement, expr, _rbrace) {
      return [...iterStatement.children, expr].map((c) => c.toWasm());
    },
    BlockStatements(_lbrace, iterStatement, _rbrace) {
      return iterStatement.children.map((c) => c.toWasm());
    },
    LetStatement(_let, ident, _eq, expr, _) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.set, localidx(info.idx)];
    },
    IfStatement(_if, expr, thenBlock, _else, iterElseBlock) {
      const elseFrag =
        iterElseBlock.child(0) ?
          [instr.else, iterElseBlock.child(0).toWasm()]
        : [];
      return [
        expr.toWasm(),
        [instr.if, blocktype.empty],
        thenBlock.toWasm(),
        elseFrag,
        instr.end,
      ];
    },
    WhileStatement(_while, cond, body) {
      return [
        [instr.loop, blocktype.empty],
        cond.toWasm(),
        [instr.if, blocktype.empty],
        body.toWasm(),
        [instr.br, labelidx(1)],
        instr.end, // end if
        instr.end, // end loop
      ];
    },
    ExprStatement(expr, _) {
      return [expr.toWasm(), instr.drop];
    },
    Expr_binary(num, iterOps, iterOperands) {
      const result = [num.toWasm()];
      for (let i = 0; i < iterOps.numChildren; i++) {
        const op = iterOps.child(i);
        const operand = iterOperands.child(i);
        result.push(operand.toWasm(), op.toWasm());
      }
      return result;
    },
    AssignmentExpr_var(ident, _, expr) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.tee, localidx(info.idx)];
    },
    AssignmentExpr_array(ident, _lbracket, idxExpr, _rbracket, _, expr) {
      const tempVar = scopes.at(-1).get('$temp');
      if (ident.sourceString === '__mem') {
        return [
          idxExpr.toWasm(),
          expr.toWasm(),
          [instr.local.tee, localidx(tempVar.idx)],
          [instr.i32.store, memarg(2, 0)],
          [instr.local.get, localidx(tempVar.idx)]
        ]
      } else {
        const varInfo = resolveSymbol(ident, scopes.at(-1))
        return [
          [instr.local.get, localidx(varInfo.idx)],
          idxExpr.toWasm(),
          expr.toWasm(),
          functionCall('__writeInt32Array')
        ]
      }
    },
    PrimaryExpr_paren(_lparen, expr, _rparen) {
      return expr.toWasm();
    },
    PrimaryExpr_index(ident, _lbracket, idxExpr, _rbracket) {
      if (ident.sourceString === '__mem') {
        return [idxExpr.toWasm(), instr.i32.load, memarg(2, 0)]
      } else {
        const varInfo = resolveSymbol(ident, scopes.at(-1))
        return [
          [instr.local.get, localidx(varInfo.idx)],
          idxExpr.toWasm(),
          functionCall('__readInt32Array')
        ]
      }
    },
    CallExpr(ident, _lparen, optArgs, _rparen) {
      const name = ident.sourceString;
      return [optArgs.children.map((c) => c.toWasm()), functionCall(name)];
    },
    Args(exp, _, iterExp) {
      return [exp, ...iterExp.children].map((c) => c.toWasm());
    },
    IfExpr(_if, expr, thenBlock, _else, elseBlock) {
      return [
        expr.toWasm(),
        [instr.if, blocktype.i32],
        thenBlock.toWasm(),
        instr.else,
        elseBlock.toWasm(),
        instr.end,
      ];
    },
    PrimaryExpr_var(ident) {
      if (ident.sourceString === '__heap_base') {
        return [instr.i32.const, i32(stringTable.data.length)];
      }
      const info = resolveSymbol(ident, scopes.at(-1));
      return [instr.local.get, localidx(info.idx)];
    },
    binaryOp(char) {
      const op = char.sourceString;
      const instructionByOp = {
        // Arithmetic
        '+': instr.i32.add,
        '-': instr.i32.sub,
        '*': instr.i32.mul,
        '/': instr.i32.div_s,
        // Comparison
        '==': instr.i32.eq,
        '!=': instr.i32.ne,
        '<': instr.i32.lt_s,
        '<=': instr.i32.le_s,
        '>': instr.i32.gt_s,
        '>=': instr.i32.ge_s,
        // Logical
        'and': instr.i32.and,
        'or': instr.i32.or,
      };
      if (!Object.hasOwn(instructionByOp, op)) {
        throw new Error(`Unhandle binary op '${op}'`);
      }
      return instructionByOp[op];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
    stringLiteral(_lquote, chars, _rquote) {
      const addr = stringTable.offsets.get(chars.sourceString);
      return [instr.i32.const, i32(addr)];
    },
  });
}

function compile(source) {
  const matchResult = wafer.match(waferPrelude + source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const symbols = buildSymbolTable(wafer, matchResult);
  const strings = buildStringTable(wafer, matchResult);

  /* console.log('Symbol table:')
  print(symbols)
  console.log('String table:')
  print(strings) */
  
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols, strings);
  defineImportDecls(semantics);
  defineFunctionDecls(semantics, symbols);

  const importDecls = semantics(matchResult).importDecls();
  const functionDecls = semantics(matchResult).functionDecls();
  const heapBase = strings.data.length;
  console.log('heap base', heapBase)
  const dataSegs = [
    {offset: 0, bytes: strings.data},
    {offset: heapBase, bytes: int32ToBytes(heapBase + 4)}
  ];
  /* console.log('Data Segments:')
  print(dataSegs) */
  return buildModule(importDecls, functionDecls, dataSegs);
}

export {
  wafer,
  defineToWasm,
  defineFunctionDecls,
  defineImportDecls,
  buildSymbolTable,
  buildModule,
  loadMod,
  compile
}