---
author: "Siddharth Mishra"
title: "Some Progress Towards a Long Time Goal"
date: "2025-08-24"
description: ""
tags: [
  "intermediate-language",
  "decompilation",
  "decompiler",
  "progress",
  "design-decision",
  "binary-analysis"
]
categories: [
    "Binary Analysis"
]
---

# A Personal Coding Standard

I've been working on improving my coding stlye for past few years and I think now I've realized it. My main goal was to make programming in C easier like it is in other languages.
I realized that the only thing that makes C hard to sometimes work with is lack of good libraries. Unlike other languages that provide an open-source well written and maintained
library for almost anything you want to do, C does not have something like that, even though it's one of the oldest languages and generally considered easy to use once you get it.

So I built something of my own (as I usually do) : [MisraStdC](https://github.com/brightprogrammer/MisraStd). This library (for now) contains some very basic things that makes
my things easier (usually). I plan to keep adding things as I keep needing it, and that's exactly what I did when I felt a need for an easy ___structured binary data parser___.

# A Custom Structured Binary Data I/O Solution

## I Love Formatted I/O

I love how easy it is to use `printf` as compared to other solutions, but I don't like how it becomes so platform dependent sometimes. Also that it has a history of crazy bugs.
So I add to the history of bugs I wrote my own formatted printer that I say is type-safe. It's not only a formatted printer, you can also use it to read into variables. Now this
formatted I/O solution existed in my codebase for about two months I loved it. During this time I was also now looking for ways in which I can specify file formats like PNG, JPEG,
ELF, PE, ISO, 7Z, ZIP, RAR, etc..., so called : the structural file formats. Solutions exist to specify each file format in a meta language like JSON, YAML (ik, yaml's not a meta language),
XML, etc... and then have a parser parse this specification, then then a binary file and attempt to read it. I also made some attempts to implement something like this in [MisraStdC](https://github.com/brightprogrammer/MisraStd)
but then somewhere in the middle I realized I might be over-engineering it.

Take a look at this PR where I attempted to describe binary files in YAML and JSON and then stopped doing it : https://github.com/brightprogrammer/MisraStdC/pull/8

## Welcome Formatted Binary I/O

Now I already had a working formatted read/write solution, but that didn't work with non-ascii characters. So all I had to do, to read binary data was to add support for it.
This involed adding a new class of I/O specifier and modifying the code a bit to allow non-ascii characters. It might've also involved adding some bugs unintentionally, but
I haven't checked for those yet, and soon will.

This is the PR that added support for binary reading/writing : https://github.com/brightprogrammer/MisraStdC/pull/9

This means that I can now just specify a sequence of format specifiers, their width and endianness to read data directly into variables, and, also use the same format
string to write it back to a binary file! This made things so much easier that I don't have enough words in my vocabulary to explain how happy I'm for it!

To give you an example, this is how I get very basic information from an ELF file :

```c

Elf* ElfLoadFromFile(Elf* elf, const char* path) {
    if (!elf || !path) {
        LOG_FATAL("Invalid arguments");
    }

    *elf      = ElfInit();
    elf->file = fopen(path, "rb");
    if (!elf->file) {
        LOG_ERROR("Failed to open file for reading.");
        return NULL;
    }

    FReadFmt(
        elf->file,
        FMT_ELF_META,
        elf->header.meta.class,
        elf->header.meta.encoding,
        elf->header.meta.version,
        elf->header.meta.os_abi,
        elf->header.meta.abi_version
    );

    // technically padding here but we can skip it
    fseek(elf->file, 7, SEEK_CUR);

    // XXX: For now we only support x86_64 binaries
    // this will also indirectly decide if elf magic is valid
    // for an invalid elf magic, any subsequent fields will be zero, and hence will be invalid
    if (elf->header.meta.class != ELF_CLASS_64) {
        LOG_FATAL(
            "Only 64-bit ELF binaries supported for now. Class for provided binary is = {}",
            elf->header.meta.class
        );
    }

    FReadFmt(
        elf->file,
        elf->header.meta.encoding == ELF_ENCODING_LSB ? FMT_ELF_HEADER_64_LE : FMT_ELF_HEADER_64_BE,
        elf->header.type,
        elf->header.machine,
        elf->header.version,
        elf->header.entry,
        elf->header.program_header_table_offset,
        elf->header.section_header_table_offset,
        elf->header.flags,
        elf->header.elf_header_size,
        elf->header.program_header_entry_size,
        elf->header.program_header_count,
        elf->header.section_header_entry_size,
        elf->header.section_header_count,
        elf->header.string_table_index
    );

    // Read section headers
    fseek(elf->file, elf->header.section_header_table_offset, SEEK_SET);
    for (u32 i = 0; i < elf->header.section_header_count; i++) {
        ElfSectionHeader sh = {0};
        FReadFmt(
            elf->file,
            elf->header.meta.encoding == ELF_ENCODING_LSB ? FMT_ELF_SECTION_HEADER_64_LE : FMT_ELF_SECTION_HEADER_64_BE,
            sh.name,
            sh.type,
            sh.flags,
            sh.addr,
            sh.offset,
            sh.size,
            sh.link,
            sh.info,
            sh.address_alignment,
            sh.table_entry_size
        );
        VecPushBack(&elf->section_headers, sh);
    }

    return elf;
}
```

The format strings are defined like this :

```c
/// Elf meta is basically the e_ident array at the very beginning of an ELF file
#define FMT_ELF_META                                                                                                   \
    "\x7f"                                                                                                             \
    "ELF"                                                                                                              \
    "{1r}" /* class */                                                                                                 \
    "{1r}" /* encoding */                                                                                              \
    "{1r}" /* version */                                                                                               \
    "{1r}" /* os_abi */                                                                                                \
    "{1r}" /* abi_version */

/// For 64-bit header for little endian encoding
#define FMT_ELF_HEADER_64_LE                                                                                           \
    "{<2r}"                                       /* type */                                                           \
    "{<2r}"                                       /* machine */                                                        \
    "{<4r}"                                       /* version */                                                        \
    "{<8r}"                                       /* entry */                                                          \
    "{<8r}"                                       /* phoff */                                                          \
    "{<8r}"                                       /* shoff */                                                          \
    "{<4r}"                                       /* flags */                                                          \
    "{<2r}"                                       /* ehsize */                                                         \
    "{<2r}"                                       /* phentsize */                                                      \
    "{<2r}"                                       /* phnum */                                                          \
    "{<2r}"                                       /* shentsize */                                                      \
    "{<2r}"                                       /* shnum */                                                          \
    "{<2r}"                                       /* shstrndx */

/// For 64-bit header with big-endian encoding
#define FMT_ELF_HEADER_64_BE                                                                                           \
    "{>2r}"                                       /* type */                                                           \
    "{>2r}"                                       /* machine */                                                        \
    "{>4r}"                                       /* version */                                                        \
    "{>8r}"                                       /* entry */                                                          \
    "{>8r}"                                       /* phoff */                                                          \
    "{>8r}"                                       /* shoff */                                                          \
    "{>4r}"                                       /* flags */                                                          \
    "{>2r}"                                       /* ehsize */                                                         \
    "{>2r}"                                       /* phentsize */                                                      \
    "{>2r}"                                       /* phnum */                                                          \
    "{>2r}"                                       /* shentsize */                                                      \
    "{>2r}"                                       /* shnum */                                                          \
    "{>2r}"                                       /* shstrndx */
```

Notice how you can provide content without any reading/write to specify that the content must exist before parsing/writing ahead.
Specifically look at how I both match, write and skip the magic bytes at the very beginning of an ELF file. This made things a lot
easier and the high-level logic very concise. The best part is this solution does not require you to parse or compile any specification,
you serialize-deserialize directly into the structures you defined in your code, and that this works not only for ELF file format,
but for just any other file format as well.


# [Zydis](https://zydis.re) The Gold Standard of X86 Disassembly

I've been told that it's just the best X86 disassembler out there. Even [capstone](https://www.capstone-engine.org/), even though supports
much more architectures, does not cover X86 that well. Don't take my word for this statement, do verify it yourself. So I'm giving [zydis](https://zydis.re)
a try this time for disassembly.

Now with the binary parsing handled easily, and disassembly taken care of I can disassemble instructions like this :


```c
    // get executable text section code
    RawData text = ElfGetSectionData(&elf, ElfGetSectionHeaderByName(&elf, ".text"));
    if (!text.data) {
        LOG_FATAL("Failed to get text section data. Cannot disassemble");
    }

    // The runtime address (instruction pointer) was chosen arbitrarily here in order to better
    // visualize relative addressing. In your actual program, set this to e.g. the memory address
    // that the code being disassembled was read from.
    ZyanU64 runtime_address = text->addr;

    // Loop over the instructions in our buffer.
    ZyanUSize                    offset = 0;
    ZydisDisassembledInstruction instruction;
    while (ZYAN_SUCCESS(ZydisDisassembleIntel(
        /* machine_mode:    */ ZYDIS_MACHINE_MODE_LONG_64,
        /* runtime_address: */ runtime_address,
        /* buffer:          */ text.data + offset,
        /* length:          */ text.length - offset,
        /* instruction:     */ &instruction
    ))) {
        const char* insn_zstr = &instruction.text[0];
        WriteFmtLn("{x}\t{}", runtime_address, insn_zstr);
        offset          += instruction.info.length;
        runtime_address += instruction.info.length;
    }
```

It never felt this easy before. I'm talking about my library, not zydis XD.

# The Meta CPU

## Uncharted

Now this is uncharted territory for me and I've never travelled this far :

- To have a good file, fast to prototype, parsing solution and
- A working disassembler at the same time.

Why I'm emphasizing on this statement this much? Imagine this :

- 1. You're not using any existing binary file parser because you need a generic solution
- 2. Your binary file format parser itself is not complete so you wanna complete it before you move ahead to the next step
  - 2.1. But! You realize that parsing it completely can be a P.I.T.A because then you're not making any significant progress to your actual goal
  - 2.2. So you consider moving ahead by parsing just the required things
  - 2.3. Later down the path you realized you need some more information and then you're back to square one, thinking of completing the implementation first
- Your disassembly works and you need more information, so you go to step 2.2 and you feel like stuck in a loop, even though you are actually making some progress

## What's Your Move?

The next step I must take is to define a theoretical machine that I'll be comfortable performing analysis on. All the disassembled instructions will be eventually
converted into equivalent instructions on this theoretical machine. This process is called lifting. You have a source instruction set and you convert it to a
target, theoretical machine instruction set that you perform analysis on. This has a few benifits :

- At a high level your analysis algorithms need to know only about one instruction set (the theoretical one)
- Can be more verbose, capture CPU operations performed during execution of an instruction like :
  - Updating flags register
  - Performing speculative execution if source CPU does that
- It's theoretical so can be augmented or simplified further
- I can't think of more at this point, I need more experience I guess.

There are a few drawbacks as well. Uplifting can be a P.I.T.A. The uplifting code has to be written very carefull and must try to match the exact behavior of CPU as much as possible.
The developer must read the documentation very carefully to understand the exact operation CPU does during the execution of the source instruction. Also, one single source
instruction can be translated into multiple theoretical instructions, making disassembly quite large and verbose. It's also possible that you don't want every tiny detail and your
CPU converts large blocks of code to single instructions. Say for example you have a built-in theoretical instruction to perform a linear search for a different array sizes.

There's also this issue of verifying the uplifted code. These are the ways I can think of (and know to exist as a solution) :

- Use a popular emulator like Qemu to compare execution traces to have some level of satisfaction with the uplifted IL
- Directly execute the source-code on source architecture and compare the execution traces with what's run inside the Meta CPU
- Manually verify everything (next to impossible)

## First Impression Might Be The Last Impression

Due to these pros and cons, I think how you define your theoretical instruction (we'll call it IL from now, short for Intermediate Language) greatly impacts how good of an analysis
you can perform you this Meta CPU. One solution some tools have found for this is to have different levels of IL for the same source assembly, depicting different levels of details,
making it easier to read at a high level, and more verbose at low level. You can take a look at [Binary Ninja](https://docs.binary.ninja/dev/bnil-overview.html) as an example.

So moving ahead, I must make a decision, make ___my move___, I must define a good enough CPU that I can refactor down the line if needed easily. This whole post is actually
just to document this one single thing : _"How I'll design the IL?"_

## Requirements

The flaw with the idea of me making an attempt to design a new IL that suits my purpose, is that I haven't yet defined the purpose yet. To have a clear path, one must have a clear goal.
So let's begin defining what I expect to do with this Meta CPU. As I've already stated this before, this is uncharted territory, so I may speak at a very high level without knowing
the intricacies of what needs to be done to achieve that. I'll therefore also start with the belief that this is a heuristic method, one with many trials and errors to get it right (if there's a _right_).

These are the requirements :

- Control flow graphs (sometimes a CFG is considered an IL in it's own)
- Be able to recover control flow structures (`loop`, `if-[then]-else`)
- Detect function boundaries, and be able to create a call graph
- Automatically detect calling convention
- Discover variables on stack, and their types and sizes
- Execute the uplifted instructions
- I don't exactly know how symbolic-execution works, but it sounds aswesome and I want it!!
- Automatic type generation based on memory access or some other novel method

A far fetched goal can be to have something like valgrind but for all architectures and for
all platforms.

## Planting The Seed

Having a basic set of requirements set-up, we must decide on what types of instructions our Meta CPU must have : 

### Instruction Set

- For generating the control flow graphs, I just need instructions control flow instructions, so my IL must have :
  - Jump
    - [`jmp addr`]
  - Conditional Jump (`je`, `jne`, `jg`, `jge`, `jl`, `jle`)
    - [`j<c> addr`]
  - Instructions like `call` and `ret` are not required, as this requires assumptions about :
    - How a return address is stored?
    - How a function returns?
    If I don't have that assumption, I can emulate this using jump instructions.
- The need for conditional jumps requires me to support basic arithmetic operations along with comparisions
  - Unary Operations : Not
    - [`<op> dst, src`]
  - Binary Opeartions : `Add`, `Sub`, `Mul`, `Div`, `Mod`, `Shift-Left`, `Shift-Right`, `Rotate-Left`, `Rotate-Right`, `Xor`, `And`, `Or`, `Logical-And`, `Logical-Or`, `Logical-Xor`
    - [`<op> dst, src1, src2`]
  - Comparision Operations : `Equal`, `Not-Equal`, `Greater-Than`, `Greater-Than-EqualTo`, `Lesser-Than`, `Lesser-Than-EqualTo`
    - [`<op> lhs, rhs`]
- There will be variables, this means there will be assignment operations, this requires the need for load/store instructions
  - Load
    - [`load<N> dst, src`] : `N` is in bits
  - Store
    - [`store<N> src, dst`] : `N` is in bits
  - Move (Assignment)
    - [`mov dst, src`], `dst` can be a memory or a register, and `src` can be a memory, register or an immediate value
- Our machine needs a stack as well
  - `Push`
    - [`push src`]
  - `Pop`
    - [`pop src`]
- Our machine will have a few instructions to interact with flags as well
  - Set Flag
    - [`setflag idx`]
  - Clear Flag
    - [`clearflag idx`]
  - Get Flag
    - [`getflag idx`]
  - And then some specialized instructions for required flags like `zf`, `cf`, `of`, etc... for `Zero-Flag`, `Carry-Flag`, `Overflow-Flag`, etc...
    - [`setcf`]
    - [`getcf`]
    - [`clearcf`]
    I'm doing it this way because to make conditional jumps and to not bloat he uplifted IL, it's better if we assume that the source machine will
    always have these flags. This list can be added to later on, but for now I think only these are required.

### Registers

Next our machine needs some registers to work with :

- The need for stack requires an immediate stack pointer (`sp`)
- We need a program counter to indicate next instruction to be executed (`pc`)
- There's no real need for a flags register because the Meta CPU instruction set has instructions to set/get/clear flags

So having the basic registers now (`sp` and `pc`), we'll allow the source machine to have as many registers
as required. This can be configured before the start of uplifting process.

### Memory

Our machine also needs memory to work with, and memory needs addressing. I can think of two ways to do this

- Memory indexed in bytes
- Memory indexed in bits (bytes * 8)

I'm really not sure of what are the pros and cons of this, so this part I'll have to experiment with.

### Parallelism

- How do we uplift for multithreaded applications?
- Should I even care about it during the uplifting process?

I know that threads are managed by an operating system, but CPUs are the one providing multiple execution units for this.

# Summary

Hopefully in the next post I'll make some progress and optimistically will complete uplifting of basic X86 instructions
to work with a sample (crackme) binary I'm working with. My current goal is to use this to analyse the sample binary, and answer a
few basic questions :

- Number of functions
  - Imported functions
  - Exported functions
  - Functions that are called directly
  - Functions that are never called directly
- Variables in each function
  - Each stack variable with valid boundaries
- What does the binary do?
- How many memory allocations does it do?
- How many memory de-allocations does it do?
- Stack space used in each function
- Heap space used in each function
- Is there a buffer overflow?
- Is there a heap overflow?
- Total memory consumption statistics with time logs on each event
- Taint analysis : user controlled data tracked by marking data as tainted as it flows down the execution stream.
- Linked libraries

In near future I'd love to have the following :

- Having a pseudo-c like decompilation
- Complete program trace of the Meta CPU's execution of loaded program
- Execute programs in a containerized environment using the Meta CPU
