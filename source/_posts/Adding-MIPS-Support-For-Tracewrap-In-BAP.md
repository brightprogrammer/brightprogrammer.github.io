---
title: Adding MIPS Support For Tracewrap In BAP
date: 2023-07-02 16:42:34
tags:
- BinaryAnalysisPlatform
- GSoC
- rizin
- trace
- testing
- rzil
- OpenSource
categories:
- rizin
- rzil
- BinaryAnalysisPlatform
- trace
---

# BAP MIPS Trace Testing Support

I've been tasked to add mips support for trace testing in BAP. These are my notes while trying to learn how to add support for MIPS. Since there's already support for some other architectures, I'll take reference from their pull requests :
- [ARM Support](https://github.com/BinaryAnalysisPlatform/qemu/pull/19)
- [PPC Support](https://github.com/BinaryAnalysisPlatform/qemu/pull/20)
- [X86 Support](https://github.com/BinaryAnalysisPlatform/qemu/pull/21)

There are very few PRs in BAP's Qemu repository. I'll use these three PRs as a reference by looking at their diffs and try to understand what and why of additions and deletions. It's almost like a reverse engineering task, just that here I'm provided with direct source code :) Let's begin!

# What is BAP?

BAP (Binary Analysis Platform) as I've mentioned in some of my previous posts, especially in [RzIL Notes](https://brightprogrammer.in/2023/04/11/RzIL-Introductory-Notes/), is a framework written for binary analysis. It has it's own modified version of OCaml language that's used to write their modules. Anyone can write a binary analysis module using BAP! They have a nice, one and only but extensive tutorial [here](https://github.com/BinaryAnalysisPlatform/bap-tutorial).

# Why Do We Care?

Rizin's RzIL uses BAP's intermediate language (Core Theory) as a reference. Now, just like any other IL used for analyzing a binary, we need to write uplifters for it. ESIL (Evaluable Strings & Intermediate Language), which is Radare's and Rizin's very old intermediate language also has uplifters as you'll see in [`/librz/analysis/p`](https://github.com/rizinorg/rizin/tree/dev/librz/analysis/p) folder for different architecture. That folder is basically contains lots of plugins for different architectures. 

Wanna analyze a custom VM obfuscator in a CTF? write easy uplifter for it in Rizin and you'll be able to analyze it in Rizin itself! You can create uplifter for a simple VM with around 20 instructions in about 200 SLOC in C. Most of the code is repetitive, you'll be just copy pasting the code for each function and mostly be modifying the arguments and internal operation. 

What do you get in return? You get call graphs, functions, variables etc... almost every feature that is provided by Rizin for any other architecture.

# Testing Intermediate Languages.

It's because RzIL is based on Core Theory, we need to follow similar steps, that it (core theory) uses to verify whether it's uplifted correctly or not? BAP has something called [trace frames](https://github.com/BinaryAnalysisPlatform/bap-frames/) that it uses to check whether the execution inside BAP's VM and actual PC matches or not. This involves recording of read/write events, storing some discernible CPU information after each instruction's execution. As far as I know, ESIL didn't use executiont traces to verify their uplifted code, but they do organize [R2Wars](https://rada.re/con/2021/#r2wars), where they ask participants to write bots in any assembly language that ESIL supports and then they execute them in a same memory region. Bot that executes for longer time will win! (I built something like that, checkout [XWars](https://github.com/X3eRo0/xwars) if you're interested in the idea)

Same is the case with RzIL. Rizin has a VM that executes RzIL code. It can be found in [`/librz/il`](https://github.com/rizinorg/rizin/tree/dev/librz/il). We need to verify the execution by comparing it with traceframes. Rizin has built a small tool [rz-tracetest](https://github.com/rizinorg/rz-tracetest) to do the following : 
- Load a binary
- Ask Rizin to uplift it to RzIL
- Execute instructions
- Compare register values after each instruction
- Compare what events were executed?
- Repeat until execution finishes.

In the end you get a small table that shows misexecutions, successful executions, incorrect ones etc...

Not only this, Rizin also has per instruction fuzz testing that's implemented using their own `rz-test` tool! But more on that in some other post because I haven't started it yet.

# How To Generate Traces?

BAP uses a modified version of [Qemu](https://github.com/BinaryAnalysisPlatform/qemu/) to create these traces. First you need installed bap and bap-frames OCaml package. Then you can build this from their GIT repository by specifying the bap-frames directory. 

After building you can do `qemu-system <options> <program>` to generate generate `<program>.frames` file for given program. This can now be used to do trace testing.

# Internal Modifications To Create Traces

This section is where actual notes start. Here we go down the rabbit hole to take a look at how everything works!

We begin with defining helpers in file named `trace_helper.h` or `helper.h` or anything similar. The signature
of helpers is something like this (you can just ripgrep them instead of searching the files) : 
```c
DEF_HELPER_X(function_name, return_type, x_number_of_arguments...)
// examples
DEF_HELPER_1(trace_newframe, void, i32) // 1 argument
DEF_HELPER_2(trace_do_something_else, void, i32, i32) // 2 arguments
DEF_HELPER_3(trace_something_more, void, i32, i32, i32) // 3 arguments
```

Let's take a look at how they are defined in `/include/exec/helper-head.h` :

```c

#define DEF_HELPER_0(name, ret) \
    DEF_HELPER_FLAGS_0(name, 0, ret)
#define DEF_HELPER_1(name, ret, t1) \
    DEF_HELPER_FLAGS_1(name, 0, ret, t1)
#define DEF_HELPER_2(name, ret, t1, t2) \
    DEF_HELPER_FLAGS_2(name, 0, ret, t1, t2)
.
.
.
```

Then `DEF_HELPER_FLAGS_N` is defined as in following files : 

![DEF_HELPER_FLAGS_N Expansion](/images/emacs-search-def-helper-expansion.png)

{% tabs helper_gen_proto_tcg_defines, 1 %}
<!-- tab helper-gen.h -->
```c
// in helper-gen.h
#define DEF_HELPER_FLAGS_0(name, flags, ret)                            \
static inline void glue(gen_helper_, name)(dh_retvar_decl0(ret))        \
{                                                                       \
  tcg_gen_callN(HELPER(name), dh_retvar(ret), 0, NULL);                 \ <--- notice this
}

#define DEF_HELPER_FLAGS_1(name, flags, ret, t1)                        \
static inline void glue(gen_helper_, name)(dh_retvar_decl(ret)          \
    dh_arg_decl(t1, 1))                                                 \
{                                                                       \
  TCGTemp *args[1] = { dh_arg(t1, 1) };                                 \
  tcg_gen_callN(HELPER(name), dh_retvar(ret), 1, args);                 \ <--- notice this
}

#define DEF_HELPER_FLAGS_2(name, flags, ret, t1, t2)                    \
static inline void glue(gen_helper_, name)(dh_retvar_decl(ret)          \
    dh_arg_decl(t1, 1), dh_arg_decl(t2, 2))                             \
{                                                                       \
  TCGTemp *args[2] = { dh_arg(t1, 1), dh_arg(t2, 2) };                  \
  tcg_gen_callN(HELPER(name), dh_retvar(ret), 2, args);                 \ <--- notice this
}
.
.
.
```
<!-- endtab -->

<!-- tab helper-proto.h -->
```c
// in helper-proto.h
#define DEF_HELPER_FLAGS_0(name, flags, ret) \
dh_ctype(ret) HELPER(name) (void);

#define DEF_HELPER_FLAGS_1(name, flags, ret, t1) \
dh_ctype(ret) HELPER(name) (dh_ctype(t1));

#define DEF_HELPER_FLAGS_2(name, flags, ret, t1, t2) \
dh_ctype(ret) HELPER(name) (dh_ctype(t1), dh_ctype(t2));
.
.
.
```
<!-- endtab -->

<!-- tab helper-tcg.h -->
```c
// in helper-tcg.h
#define DEF_HELPER_FLAGS_0(NAME, FLAGS, ret) \
  { .func = HELPER(NAME), .name = str(NAME), \
    .flags = FLAGS | dh_callflag(ret), \
    .typemask = dh_typemask(ret, 0) },

#define DEF_HELPER_FLAGS_1(NAME, FLAGS, ret, t1) \
  { .func = HELPER(NAME), .name = str(NAME), \
    .flags = FLAGS | dh_callflag(ret), \
    .typemask = dh_typemask(ret, 0) | dh_typemask(t1, 1) },

#define DEF_HELPER_FLAGS_2(NAME, FLAGS, ret, t1, t2) \
  { .func = HELPER(NAME), .name = str(NAME), \
    .flags = FLAGS | dh_callflag(ret), \
    .typemask = dh_typemask(ret, 0) | dh_typemask(t1, 1) \
    | dh_typemask(t2, 2) },
.
.
.
```
<!-- endtab -->
{% endtabs %}


Another macro, ok, this is the last one : 

```c
// glue just concatenates helper_ and name together like helper_name
// eg: HELPER(newframe) will generate the name helper_newframe
#define HELPER(name) glue(helper_, name)
```

Also, take a look at [`dh_ctype` definition](https://github.com/BinaryAnalysisPlatform/qemu/blob/f1f0761ae79da64b5ecd9cc32d165f94e2fcf9a2/include/exec/helper-head.h#L38) if you're curious, its not much, it just evaluates to one of the `ctypes`

<!-- ![Defining helpers to create a new traceframe](/images/emacs-search-def-helper.png) -->

Which one of those above defined helper macros will be expanded depends on which header they include. Let's take a look.

![helpers.h](/images/emacs-helper-header-uses.png)

But now the question is where do these definitions get used? Are they all used in same src code or are they separated module wise. The fact that names of these headers are different hints that they may be used separately.

After searching we see that `helper-tcg.h` is included only in some i386 folders. 

{% tabs emacs_helper_gen_proto_search, 1 %}
<!-- tab helper-gen.h search -->
But `helper-gen.h` is included in almost all architecture's `translate.c` file.
![include header-gen.h search found in translate.c files](/images/emacs-search-translate-c.png)
<!-- endtab -->

<!-- tab helper-proto.h search -->
Similarly we find `helper-proto.h` included in many files. We see it being included into `translate.c` files also.
![header-proto.h inclusion search](/images/emacs-search-helper-proto-h.png)
<!-- endtab -->
{% endtabs%}




This is an interesting discovery as we'll see in a moment.

# Helpers

Helpers are declared in `trace_helper.h` or `helper.h` files and then defined in `trace_helper.c` or `helper.c` files. 

{% tabs emacs_trace_helper_search_images, %}
<!-- tab trace_helper.h search -->
![trace_helper.h headers](/images/emacs-search-trace-helper-h-c.png)
<!-- endtab -->

<!-- tab helper.h search -->
![helper.h headers - notice architecture folders](/images/emacs-search-helper-h-c.png)
<!-- endtab -->
{% endtabs%}

and if you look inside `helper.h` headers, you'll always find something similar to this :
![helper.h inside view](/images/helper-h-inside-view.png)

Notice `DEF_HELPER_X` declarations. Now when this helper.h will be included in `target/mips/translate.c` through `include/exec/helper-gen.h` and `include/exec/helper-proto.h` their names will change! Why? Please go little but up and see the definition of these macros.

- `helper-proto.h` declares functions with names `HELPER(fn_name)` which will translate into `helper_fn_name(...)`
- `helper-gen.h` declares functions with names `glue(gen_helper_, fn_name)` which translates to `gen_helper_fn_name`
- The difference between these two is in their names and how they work. `gen_helper_xxx` functions eventually call `helper_xxx`, if you look at their defintions.

To sum it up :

```mermaid
graph TD;

TCG{helper-tcg.h};
PROTO{helper-proto.h};
GEN{helper-gen.h};
HLPR{helper.h};
TRC{trace_helper.c};

TR[translate.c];
TR --> |include| PROTO;
TR --> |include| GEN;

GHF[gen_helper_function];
HF[helper_function];

GEN --> |include| HLPR;
HLPR --> |declare and define| GHF;
GHF --> |call| HF;

PROTO --> |include| HLPR;
HLPR --> |declare| HF;
TRC --> |define| HF;

TCG --> |store function addess | HF;
```

Now we don't need to define the `gen_helper_xxx` functions but we do need to define `helper_xxx` functions that'll get called by `gen_helper_xxx` functions. 

Ok, so now what? We need know how these functions are declared but where are the `helper_xxx` functions defined? Let's take a look at their definitions. I'll take PPC and ARM as references since MIPS is not complete yet.

{% tabs trace_helper_implementations, 1 %}
<!-- tab /target/ppc/trace_helper.c -->
```c
void HELPER(trace_newframe)(uint64_t pc) {
    qemu_trace_newframe(pc, 0);
}

void HELPER(trace_endframe)(CPUPPCState *state, uint64_t pc) {
    qemu_trace_endframe(state, pc, PPC_INSN_SIZE);
}
```
<!-- endtab -->

<!-- tab /target/arm/trace_helper.c -->
```c
void HELPER(trace_newframe)(uint32_t pc) {
    qemu_trace_newframe(pc, 0);
}

void HELPER(trace_endframe)(CPUARMState *env, uint32_t old_pc, uint32_t size) {
    qemu_trace_endframe(env, old_pc, size);
}
```
<!-- endtab -->
{% endtabs %}

These functions can be called to start and end a frame. Next we need to see, where and how these functions are called. Why again? because that's the only lead I have at the moment to further understand the working.

# Capturing Traces

To start and stop capturing traces, I see, we have two functions. `gen_trace_newframe` and `gen_trace_endframe`. Notice how they eventually call the `gen_helper_xyz` functions and not the `helper_xyz` ones.

{% tabs gen_trace_newframe_definition, 2 %}
<!-- tab /target/ppc/translate.c -->
```c
#ifdef HAS_TRACEWRAP
#include <frame_arch.h> // <- in bap-frames/libtrace/frame_arch.h

static inline void gen_trace_newframe(uint64_t pc)
{
    TCGv_i64 tmp0 = tcg_temp_new_i64();
    tcg_gen_movi_i64(tmp0, pc);
#ifdef TARGET_PPC64
    TCGv_ptr mt = tcg_const_ptr(FRAME_MODE_PPC64);
#else
    TCGv_ptr mt = tcg_const_ptr(FRAME_MODE_PPC32);
#endif
    gen_helper_trace_newframe(tmp0);
    gen_helper_trace_mode(mt);
    tcg_temp_free_ptr(mt);
    tcg_temp_free_i64(tmp0);
}

static inline void gen_trace_endframe(uint64_t pc)
{
    TCGv_i64 tmp0 = tcg_temp_new_i64();
    tcg_gen_movi_i64(tmp0, pc);
    gen_helper_trace_endframe(cpu_env, tmp0);
    tcg_temp_free_i64(tmp0);
}
.
. // some other gen_xyz functions (not helper ones!)
.
#endif // HAS_TRACEWRAP
```
<!-- endtab -->

<!-- tab /target/arm/translate.c -->
```c
#ifdef HAS_TRACEWRAP
static inline void gen_trace_newframe(DisasContext *s)
{
    TCGv_i32 t = tcg_const_i32(s->pc_curr);
    gen_helper_trace_newframe(t);
    tcg_temp_free_i32(t);
    TCGv_ptr mt = tcg_const_ptr(s->thumb ? FRAME_MODE_ARM_T32 : FRAME_MODE_ARM_A32);
    gen_helper_trace_mode(mt);
    tcg_temp_free_ptr(mt);
    trace_cpsr_reset();
}

static inline void gen_trace_endframe(DisasContext *s)
{
    TCGv_i32 tmp0 = tcg_temp_new_i32();
    TCGv_i32 tmp1 = tcg_temp_new_i32();
    tcg_gen_movi_i32(tmp0, s->pc_curr);
    tcg_gen_movi_i32(tmp1, s->insn_size);
    gen_helper_trace_endframe(cpu_env, tmp0, tmp1);
    tcg_temp_free_i32(tmp0);
    tcg_temp_free_i32(tmp1);
}
#endif //HAS_TRACEWRAP
```
<!-- endtab -->
{% endtabs %}

They are used in functions `<arch>_tr_translate_insn(...)`

{% tabs gen_trace_fns_usage, 1 %}
<!-- tab ppc_tr_tanslate_insn -->
```c
static void ppc_tr_translate_insn(DisasContextBase *dcbase, CPUState *cs)
{
    // initialize 
    
#ifdef HAS_TRACEWRAP
    gen_trace_newframe(ctx->cia); // <------ TRACE START
#endif

    // do translation etc...

#ifdef HAS_TRACEWRAP
    gen_trace_endframe(ctx->cia); // <------ TRACE STOP
#endif

    // ending work
}
```
<!-- endtab -->

<!-- tab arm_tr_translate_insn -->
```c
static void arm_tr_translate_insn(DisasContextBase *dcbase, CPUState *cpu)
{
    // initialize 
    
#ifdef HAS_TRACEWRAP
    gen_trace_newframe(dc); // <----- TRACE START, STOP IN SOME OTHER FUNCTION
#endif //HAS_TRACEWRAP
   
    // some other work
   
#ifdef HAS_TRACEWRAP
    gen_trace_flush_cpsr();
#endif //HAS_TRACEWRAP

    // more work

    arm_post_translate_insn(dc); // <------ TRACE WILL BE STOPPED HERE
}

static void arm_post_translate_insn(DisasContext *dc)
{
    if (dc->condjmp && !dc->base.is_jmp) {
        gen_set_label(dc->condlabel);
        dc->condjmp = 0;
    }
#ifdef HAS_TRACEWRAP
    gen_trace_endframe(dc); // <------ TRACE STOPPED
#endif //HAS_TRACEWRAP
    translator_loop_temp_check(&dc->base);
}
```
<!-- endtab -->
{% endtabs %}

# Adding Our Own `newframe` and `endframe` Functions In MIPS

I'll need to define two such functions inside `/target/mips/tcg/translate.c`.

```c
static inline void gen_trace_newframe(uint64_t pc) {
#ifdef HAS_TRACEWRAP

    // create new traceframe
    TCGv_i64 _pc = tcg_const_i64(pc);
    gen_helper_trace_newframe(_pc);
    tcg_temp_free_i64(_pc);

    // get machine type
#ifdef TARGET_MIPS64
    TCGv_ptr mt = tcg_const_ptr(FRAME_MODE_MIPS64); // TODO: Check this
#else
    TCGv_ptr mt = tcg_const_ptr(FRAME_MODE_MIPS);
#endif // TARGET_MIPS64

    // set trace mode to mips64 or mips
    gen_helper_trace_mode(mt);
    tcg_trace_free_ptr(mt);

#endif // HAS_TRACEWRAP
}

static inline void gen_trace_endframe(uint64_t pc) {
#ifdef HAS_TRACEWRAP

    TCGv_i64 _pc = tcg_const_i64(pc);
    gen_helper_trace_endframe(cpu_env, _pc);
    tcg_temp_free_i64(_pc);

#endif // HAS_TRACEWRAP
}
```

Now we need to add these functions to their appropriate places. I found the `mips_tr_translate_insn` function and after adding the `newframe` and `endframe` functions to this, it looks like this : 

```c

static void mips_tr_translate_insn(DisasContextBase *dcbase, CPUState *cs)
{
    CPUMIPSState *env = cs->env_ptr;
    DisasContext *ctx = container_of(dcbase, DisasContext, base);
    int insn_bytes;
    int is_slot;

    // get pc_next and start generating new traceframe
    uint64_t pc_next = ctx->base.px_next;
    gen_trace_newframe(pc_next);

    // translate depending on architecture
    is_slot = ctx->hflags & MIPS_HFLAG_BMASK;
    if (ctx->insn_flags & ISA_NANOMIPS32) {
        ctx->opcode = translator_lduw(env, &ctx->base, pc_next);
        insn_bytes = decode_isa_nanomips(env, ctx);
    } else if (!(ctx->hflags & MIPS_HFLAG_M16)) {
        ctx->opcode = translator_ldl(env, &ctx->base, pc_next);
        insn_bytes = 4;
        decode_opc(env, ctx);
    } else if (ctx->insn_flags & ASE_MICROMIPS) {
        ctx->opcode = translator_lduw(env, &ctx->base, pc_next);
        insn_bytes = decode_isa_micromips(env, ctx);
    } else if (ctx->insn_flags & ASE_MIPS16) {
        ctx->opcode = translator_lduw(env, &ctx->base, pc_next);
        insn_bytes = decode_ase_mips16e(env, ctx);
    } else {
        gen_reserved_instruction(ctx);
        g_assert(ctx->base.is_jmp == DISAS_NORETURN);
        return;
    }

    if (ctx->hflags & MIPS_HFLAG_BMASK) {
        if (!(ctx->hflags & (MIPS_HFLAG_BDS16 | MIPS_HFLAG_BDS32 |
                             MIPS_HFLAG_FBNSLOT))) {
            /*
             * Force to generate branch as there is neither delay nor
             * forbidden slot.
             */
            is_slot = 1;
        }
        if ((ctx->hflags & MIPS_HFLAG_M16) &&
            (ctx->hflags & MIPS_HFLAG_FBNSLOT)) {
            /*
             * Force to generate branch as microMIPS R6 doesn't restrict
             * branches in the forbidden slot.
             */
            is_slot = 1;
        }
    }
    if (is_slot) {
        gen_branch(ctx, insn_bytes);
    }

    // update pc for next instruction
    // and get pc_next
    ctx->base.pc_next += insn_bytes;
    pc_next = ctx->base.pc_next;

    if (ctx->base.is_jmp != DISAS_NEXT) {
        return;
    }

    /*
     * End the TB on (most) page crossings.
     * See mips_tr_init_disas_context about single-stepping a branch
     * together with its delay slot.
     */
    if (pc_next - ctx->page_start >= TARGET_PAGE_SIZE
        && !ctx->base.singlestep_enabled) {
        ctx->base.is_jmp = DISAS_TOO_MANY;
    }

    // end the frame
    gen_pc_endframe(pc_next);
}
```

So now the control flow will look like this

```mermaid
graph TD;

EXEC_ALL[ /include/exec/exec-all.h ] --> |declare| GEN_TCG((gen_intermediate_code));
TRANSLATE_C[ /target/path/to/translate.c ] --> |define| GEN_TCG;

CPU_EXEC([cpu_exec_step_atomic]) --> |call| TB_GEN_CODE([tb_gen_code]);
TB_GEN_CODE --> |call| GEN_TCG;
LUSER[ /linux-user/arch/cpu_loop.c ] --> |define| CPU_LOOP([cpu_loop]) --> |call| CPU_EXEC;

ACCEL_INTERNAL[ /accel/tcg/internal.h ] --> |declare| TB_GEN_CODE;
ACCEL_TR_ALL[ /accel/tcg/translate-all.c ] --> |define| TB_GEN_CODE;

GEN_TCG --> |call| TR_LOOP([translator_loop]);
TR_LOOP --> |while true| TR_LOOP_BEG{translator loop begin};
TR_LOOP_BEG --> |call| MIPS_TR([mips_tr_translate_insn]);
MIPS_TR --> |call| NF([gen_trace_newframe]);
NF --> |followed by| EF([gen_trace_endframe]);
EF --> TR_LOOP_END{more instructions?};
TR_LOOP_END --> |yes| TR_LOOP_BEG;
TR_LOOP_END --> |no| EXIT((exit));
```

This looks like an interesting flowchart!
