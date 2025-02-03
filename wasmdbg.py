#!/usr/bin/env python3

import sys
from enum import Enum
from dataclasses import dataclass


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
        count = count + 8

    return num


def parse_name(stream):
    length = parse_leb128(stream)
    name = ''
    while len(name) < length:
        char = stream.read(1)
        name = name + char.decode('ascii')

    return name


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
        print(self.name)

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
        self.code = None

    def parse(self, stream):
        self.size = parse_leb128(stream)

        num_locals = parse_leb128(stream)
        while len(self.locals) < num_locals:
            num_of_type = parse_leb128(stream)
            typ = ValType(uint(stream.read(1)))

            self.locals.append(Local(num=num_of_type, typ=typ))

        # TODO: read into `self.code` until we have read `self.size` bytes,
        # including those read for the locals.
        # There should be a `instr.END` to end the code block.


class Section:
    def __init__(self, size):
        self.size = size
        self._init()

    def _init(self):
        pass

    def parse(self, stream):
        assert self.size >= 0
        if self.size == 0:
            return
        return self._parse(stream)

    def _parse(self, stream):
        raise Exception('Not implemented')


class TypeSection(Section):
    def _init(self):
        self.functions = []

    def _parse(self, stream):
        num_funcs = parse_leb128(stream)
        print(f'  num funcs: {num_funcs}')

        for idx in range(num_funcs):
            type_id = TypeID(uint(stream.read(1)))
            assert type_id == TypeID.FUNCTION

            func = Function()
            func.parse(stream)

            self.functions.append(func)


class ImportSection(Section):
    def _parse(self, stream):
        num_imports = parse_leb128(stream)
        print(f'  num imports: {num_imports}')

        for idx in range(num_imports):
            # Not yet supported
            raise Exception('Not supported')


class FunctionSection(Section):
    def _init(self):
        self.func_idx = []

    def _parse(self, stream):
        num_funcs = parse_leb128(stream)
        print(f'  num functions: {num_funcs}')

        while len(self.func_idx) < num_funcs:
            func_idx = parse_leb128(stream)
            self.func_idx.append(func_idx)


class MemorySection(Section):
    def _init(self):
        self.memories = []

    def _parse(self, stream):
        num_mems = parse_leb128(stream)
        print(f'  num memories: {num_mems}')

        while len(self.memories) < num_mems:
            mem = Memory()
            mem.parse(stream)

            self.memories.append(mem)


class ExportSection(Section):
    def _init(self):
        self.exports = []

    def _parse(self, stream):
        num_exports = parse_leb128(stream)
        print(f'  num exports: {num_exports}')

        while len(self.exports) < num_exports:
            export = Export()
            export.parse(stream)

            self.exports.append(export)


class CodeSection(Section):
    def _init(self):
        self.codes = []

    def _parse(self, stream):
        num_codes = parse_leb128(stream)
        print(f'  num codes: {num_codes}')

        while len(self.codes) < num_codes:
            code = Code()
            code.parse(stream)

            self.codes.append(code)


def _section_from_id(sec_id):
    try:
        return {
            SectionID.TYPE: TypeSection,
            SectionID.IMPORT: ImportSection,
            SectionID.FUNCTION: FunctionSection,
            SectionID.MEMORY: MemorySection,
            SectionID.EXPORT: ExportSection,
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
        mod.parse(fp)

    print('WebAssembly module')
    print(f'  version: {mod.version}')
    print('  Sections:')

if __name__ == '__main__':
    main()