#!/usr/bin/env python3

import os
import sys
from enum import Enum
from dataclasses import dataclass


class SectionID(Enum):
    TYPE = 1
    IMPORT = 2
    FUNCTION = 3
    TABLE = 4
    MEMORY = 5
    GLOBAL = 6
    EXPORT = 7
    START = 8
    ELEMENT = 9
    CODE = 10
    DATA = 11
    DATA_COUNT = 12


class TypeID(Enum):
    FUNCTION = 0x60


class ValType(Enum):
    i32 = 0x7f
    i64 = 0x7e
    f32 = 0x7d
    f64 = 0x7c


class Instruction(Enum):
    UNREACHABLE = 0x00
    NOP = 0x01
    BLOCK = 0x02
    LOOP = 0x03
    IF = 0x04
    ELSE = 0x05
    # reserved space
    END = 0x0b
    BR = 0x0c
    BR_IF = 0x0d
    BR_TABLE = 0x0e
    RETURN = 0x0f
    CALL = 0x10
    CALL_INDIRECT = 0x11
    # reserved space
    DROP = 0x1a
    SELECT = 0x1b
    SELECT_T = 0x1c
    # reserved space
    LOCAL_GET = 0x20
    LOCAL_SET = 0x21
    LOCAL_TEE = 0x22
    GLOBAL_GET = 0x23
    GLOBAL_SET = 0x24
    TABLE_GET = 0x25
    TABLE_SET = 0x26
    # reserved space
    I32_LOAD = 0x28
    I64_LOAD = 0x29
    F32_LOAD = 0x2a
    F64_LOAD = 0x2b
    I32_LOAD8_S = 0x2c
    I32_LOAD8_U = 0x2d
    I32_LOAD16_S = 0x2e
    I32_LOAD16_U = 0x2f
    I64_LOAD8_S = 0x30
    I64_LOAD8_U = 0x31
    I64_LOAD16_S = 0x32
    I64_LOAD16_U = 0x33
    I64_LOAD32_S = 0x34
    I64_LOAD32_U = 0x35
    I32_STORE = 0x36
    I64_STORE = 0x37
    F32_STORE = 0x38
    F64_STORE = 0x39
    I32_STORE8 = 0x3a
    I32_STORE16 = 0x3b
    I64_STORE8 = 0x3c
    I64_STORE16 = 0x3d
    I64_STORE32 = 0x3e
    MEMORY_SIZE = 0x3f
    MEMORY_GROW = 0x40
    I32_CONST = 0x41
    I64_CONST = 0x42
    F32_CONST = 0x43
    F64_CONST = 0x44
    I32_EQZ = 0x45
    I32_EQ = 0x46
    I32_NE = 0x47
    I32_LT_S = 0x48
    I32_LT_U = 0x49
    I32_GT_S = 0x4a
    I32_GT_U = 0x4b
    I32_LE_S = 0x4c
    I32_LE_U = 0x4d
    I32_GE_S = 0x4e
    I32_GE_U = 0x4f
    I64_EQZ = 0x50
    I64_EQ = 0x51
    I64_NE = 0x52
    I64_LT_S = 0x53
    I64_LT_U = 0x54
    I64_GT_S = 0x55
    I64_GT_U = 0x56
    I64_LE_S = 0x57
    I64_LE_U = 0x58
    I64_GE_S = 0x59
    I64_GE_U = 0x5a
    F32_EQ = 0x5b
    F32_NE = 0x5c
    F32_LT = 0x5d
    F32_GT = 0x5e
    F32_LE = 0x5f
    F32_GE = 0x60
    F64_EQ = 0x61
    F64_NE = 0x62
    F64_LT = 0x63
    F64_GT = 0x64
    F64_LE = 0x65
    F64_GE = 0x66
    I32_CLZ = 0x67
    I32_CTZ = 0x68
    I32_POPCNT = 0x69
    I32_ADD = 0x6a
    I32_SUB = 0x6b
    I32_MUL = 0x6c
    I32_DIV_S = 0x6d
    I32_DIV_U = 0x6e
    I32_REM_S = 0x6f
    I32_REM_U = 0x70
    I32_AND = 0x71
    I32_OR = 0x72
    I32_XOR = 0x73
    I32_SHL = 0x74
    I32_SHR_S = 0x75
    I32_SHR_U = 0x76
    I32_ROTL = 0x77
    I32_ROTR = 0x78
    I64_CLZ = 0x79
    I64_CTZ = 0x7a
    I64_POPCNT = 0x7b
    I64_ADD = 0x7c
    I64_SUB = 0x7d
    I64_MUL = 0x7e
    I64_DIV_S = 0x7f
    I64_DIV_U = 0x80
    I64_REM_S = 0x81
    I64_REM_U = 0x82
    I64_AND = 0x83
    I64_OR = 0x84
    I64_XOR = 0x85
    I64_SHL = 0x86
    I64_SHR_S = 0x87
    I64_SHR_U = 0x88
    I64_ROTL = 0x89
    I64_ROTR = 0x8a
    F32_ABS = 0x8b
    F32_NEG = 0x8c
    F32_CEIL = 0x8d
    F32_FLOOR = 0x8e
    F32_TRUNC = 0x8f
    F32_NEAREST = 0x90
    F32_SQRT = 0x91
    F32_ADD = 0x92
    F32_SUB = 0x93
    F32_MUL = 0x94
    F32_DIV = 0x95
    F32_MIN = 0x96
    F32_MAX = 0x97
    F32_COPYSIGN = 0x98
    F64_ABS = 0x99
    F64_NEG = 0x9a
    F64_CEIL = 0x9b
    F64_FLOOR = 0x9c
    F64_TRUNC = 0x9d
    F64_NEAREST = 0x9e
    F64_SQRT = 0x9f
    F64_ADD = 0xa0
    F64_SUB = 0xa1
    F64_MUL = 0xa2
    F64_DIV = 0xa3
    F64_MIN = 0xa4
    F64_MAX = 0xa5
    F64_COPYSIGN = 0xa6
    I32_WRAP_I64 = 0xa7
    I32_TRUNC_F32_S = 0xa8
    I32_TRUNC_F32_U = 0xa9
    I32_TRUNC_F64_S = 0xaa
    I32_TRUNC_F64_U = 0xab
    I64_EXTEND_I32_S = 0xac
    I64_EXTEND_I32_U = 0xad
    I64_TRUNC_F32_S = 0xae
    I64_TRUNC_F32_U = 0xaf
    I64_TRUNC_F64_S = 0xb0
    I64_TRUNC_F64_U = 0xb1
    F32_CONVERT_I32_S = 0xb2
    F32_CONVERT_I32_U = 0xb3
    F32_CONVERT_I64_S = 0xb4
    F32_CONVERT_I64_U = 0xb5
    F32_DEMOTE_F64 = 0xb6
    F64_CONVERT_I32_S = 0xb7
    F64_CONVERT_I32_U = 0xb8
    F64_CONVERT_I64_S = 0xb9
    F64_CONVERT_I64_U = 0xba
    F64_PROMOTE_F32 = 0xbb
    I32_REINTERPRET_F32 = 0xbc
    I64_REINTERPRET_F64 = 0xbd
    F32_REINTERPRET_I32 = 0xbe
    F64_REINTERPRET_F64 = 0xbf
    I32_EXTEND8_S = 0xc0
    I32_EXTEND16_S = 0xc1
    I64_EXTEND8_S = 0xc2
    I64_EXTEND16_S = 0xc3
    I64_EXTEND32_S = 0xc4
    # reserved
    REF_NULL = 0xd0
    REF_IS_NULL = 0xd1
    REF_FUNC = 0xd2
    # reserved


def uint(b):
    return int.from_bytes(b, 'little')


def parse_leb128(stream):
    num = 0
    count = 0
    while True:
        byte = stream.read(1)
        num += (uint(byte) & 127) << count
        if uint(byte) & 128 == 0:
            break
        count = count + 7

    return num


def parse_name(stream):
    length = parse_leb128(stream)
    name = ''
    while len(name) < length:
        char = stream.read(1)
        name = name + char.decode('ascii')

    return name


def parse_expression(stream):
    expr = []
    instr = None
    while True:
        # TODO: handle other const types
        if instr == Instruction.I32_CONST:
            value = parse_leb128(stream)
            expr.append(value)
            instr = None
        else:
            instr = Instruction(uint(stream.read(1)))
            expr.append(instr)
            if instr == Instruction.END:
                break
            
    return expr
    

class CountStream:
    def __init__(self, stream):
        self.stream = stream
        self.size = self._file_length(stream)
        self.start()
    
    def _file_length(self, stream):
        stream.seek(0, os.SEEK_END)
        size = stream.tell()
        stream.seek(0, os.SEEK_SET) 
        return size

    def start(self):
        self.count = 0
        
    def read(self, num_bytes):
        b = self.stream.read(num_bytes) 
        self.count += len(b)
        return b
    
    def tell(self):
        return self.stream.tell()


class Function:
    def __init__(self):
        self.param_types = []
        self.result_types = []

    def parse(self, stream):
        # Vector of param types
        num_param_types = parse_leb128(stream)
        while len(self.param_types) < num_param_types:
            param_type = ValType(uint(stream.read(1)))
            self.param_types.append(param_type)

        num_result_types = parse_leb128(stream)
        while len(self.result_types) < num_result_types:
            result_type = ValType(uint(stream.read(1)))
            self.result_types.append(result_type)


class Memory:
    def __init__(self):
        self.min = None
        self.max = None

    def parse(self, stream):
        limit_type = uint(stream.read(1))
        if limit_type == 0:
            self.min = parse_leb128(stream)
        elif limit_type == 1:
            self.min = parse_leb128(stream)
            self.max = parse_leb128(stream)
        else:
            raise Exception(f'Memory limit must be 0 or 1, got {limit_type}')


class Export:
    def __init__(self):
        self.name = None
        self.funcidx = None
        self.memidx = None

    def parse(self, stream):
        self.name = parse_name(stream)

        export_type = uint(stream.read(1))
        if export_type == 0:
            funcidx = parse_leb128(stream)
            self.funcidx = funcidx
        elif export_type == 2:
            memidx = parse_leb128(stream)
            self.memidx = memidx
        else:
            raise Exception(f'Bad export, must be 0 or 2. Got {export_type}')


@dataclass(frozen=True)
class Local:
    num: int
    typ: ValType


class Code:
    def __init__(self):
        self.size = None
        self.locals = []
        self.instructions = []

    def parse(self, stream):
        self.size = parse_leb128(stream)
        stream_count = stream.count

        num_locals = parse_leb128(stream)
        while len(self.locals) < num_locals:
            num_of_type = parse_leb128(stream)
            typ = ValType(uint(stream.read(1)))

            self.locals.append(Local(num=num_of_type, typ=typ))

        prev_instr = None
        while stream.count < stream_count + self.size:

            if prev_instr == Instruction.I32_CONST:
                value = parse_leb128(stream)
                self.instructions.append(value)
                prev_instr = None
            # TODO: handle other `const` instructions
            else:
                instr = Instruction(uint(stream.read(1)))
                self.instructions.append(instr)
                prev_instr = instr
                

class Data:
    def __init__(self):
        self.memidx = None
        self.expr = None
        self.data = None
        
    def parse(self, stream):
        self.memidx = parse_leb128(stream) 
        self.expr = parse_expression(stream)
        
        num_bytes = parse_leb128(stream)
        self.data = stream.read(num_bytes)
        # for d in self.data:
        #   print(f'{hex(d)} - {chr(d)}')


class Section:
    def __init__(self, size):
        self.size = size
        self._init()

    def _init(self):
        pass

    def parse(self, stream):
        stream.start()
        assert self.size >= 0
        if self.size == 0:
            return
        result = self._parse(stream)
        assert stream.count == self.size, f'{stream.count} == {self.size}'
        return result

    def _parse(self, stream):
        raise Exception('Not implemented')


class TypeSection(Section):
    def _init(self):
        self.functions = []

    def _parse(self, stream):
        num_funcs = parse_leb128(stream)

        for idx in range(num_funcs):
            type_id = TypeID(uint(stream.read(1)))
            assert type_id == TypeID.FUNCTION

            func = Function()
            func.parse(stream)

            self.functions.append(func)


class ImportSection(Section):
    def _parse(self, stream):
        num_imports = parse_leb128(stream)

        for idx in range(num_imports):
            # Not yet supported
            raise Exception('Not supported')


class FunctionSection(Section):
    def _init(self):
        self.func_idx = []

    def _parse(self, stream):
        num_funcs = parse_leb128(stream)

        while len(self.func_idx) < num_funcs:
            func_idx = parse_leb128(stream)
            self.func_idx.append(func_idx)


class MemorySection(Section):
    def _init(self):
        self.memories = []

    def _parse(self, stream):
        num_mems = parse_leb128(stream)

        while len(self.memories) < num_mems:
            mem = Memory()
            mem.parse(stream)

            self.memories.append(mem)


class ExportSection(Section):
    def _init(self):
        self.exports = []

    def _parse(self, stream):
        num_exports = parse_leb128(stream)

        while len(self.exports) < num_exports:
            export = Export()
            export.parse(stream)

            self.exports.append(export)


class CodeSection(Section):
    def _init(self):
        self.codes = []

    def _parse(self, stream):
        num_codes = parse_leb128(stream)

        while len(self.codes) < num_codes:
            code = Code()
            code.parse(stream)

            self.codes.append(code)


class DataSection(Section):
    def _init(self):
        self.datas = []

    def _parse(self, stream):
        num_datas = parse_leb128(stream)
        
        while len(self.datas) < num_datas:
            print(f'Data section {len(self.datas)}')
            data = Data()
            data.parse(stream)
            self.datas.append(data)


def _section_from_id(sec_id):
    try:
        return {
            SectionID.TYPE: TypeSection,
            SectionID.IMPORT: ImportSection,
            SectionID.FUNCTION: FunctionSection,
            SectionID.MEMORY: MemorySection,
            SectionID.EXPORT: ExportSection,
            SectionID.CODE: CodeSection,
            SectionID.DATA: DataSection
        }[sec_id]
    except KeyError:
        raise Exception(f'Bad section ID: {sec_id}')


class Module:
    def __init__(self):
        self.sections = []
        self.version = None

    def _parseMagic(self, stream):
        magic = stream.read(4)
        if magic != b'\x00asm':
            raise Exception(f'Bad magic: {magic}')

    def _parseVersion(self, stream):
        version = stream.read(4)
        if version != b'\x01\x00\x00\x00':
            raise Exception(f'Bad version: {version}')
        
        self.version = uint(version)

    def _parseSections(self, stream):
        while True:
            if stream.tell() == stream.size:
                # end of input
                return

            print('parsing section...')
            sec_id_bytes = stream.read(1)  # 1 byte
            sec_id = SectionID(uint(sec_id_bytes))
            print(f'  id: {sec_id}')
            section_cls = _section_from_id(sec_id)

            sec_size = parse_leb128(stream)
            print(f'Section size: {sec_size}')
            section = section_cls(sec_size)
            self.sections.append(section)

            section.parse(stream)

    def parse(self, stream):
        self._parseMagic(stream)
        self._parseVersion(stream)
        self._parseSections(stream)


def main():
    filename = sys.argv[1]

    mod = Module()
    with open(filename, 'rb') as fp:
        mod.parse(CountStream(fp))

    print('WebAssembly module')
    print(f'  version: {mod.version}')
    print('  Sections:')

if __name__ == '__main__':
    main()