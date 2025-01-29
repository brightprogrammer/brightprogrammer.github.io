---
author: "Siddharth Mishra"
title: "A Build System For C in C"
date: "2025-01-29"
description: "An experimental project : SelfStart"
tags:
  [
    "build-system",
    "cmake",
    "build",
    "make",
    "ninja",
    "c"
  ]
---

I recently started a new project where I had to decide (again) how to build this project. This decision is faced
by any developer who use a language that does not have a standard way of building things. In my case, my project
is to be written in C, my go-to language, and as we all know, it does not have any standard other than the standard
spec. I usually go with CMake, as my go-to build system, because I've seen many projects use it. It's almost like
the "industry" standard. It's very old, and regularly updated, to keep itself up to date with available libraries,
frameworks, compiler features etc... and it might be good for very big projects, but I decided that I'll try something
simpler this time.

## What It's Like Using A Build System (Like CMake)

There are many many steps involved.

- First you get the prebuilt binaries of the build system your project uses to build.
- Install the binaries, and any other dependencies like `ninja`, `GNU Makefile` or `MinGW Makefile`, etc...
- Then in the project you do something like `cmake -B build -G Ninja -D CMAKE_BUILD_TYPE=Debug`. This step is common across any build system,
  just that it comes in different forms. This step will generate build comamnds for you depending on the program you selected (`Ninja` or `Makefile`).
- Then you start building the project with a command like `ninja -C build`, which will parse all the generated build commands and then build the project.

Now this process is easy. But it involves one extra step : Installing of build tools. It takes extra time for setting up the project
on a new machine. Now, if it already comes built in with the operating system, then it's not really a problem. On linux distros, you
can get these from a single command, and after waiting some time, you'll have these tools available to you. But here are a few more things
I don't like about it when using these complex build systems :

- You have to learn a different DSL, that is quite complex, other than the language/tech-stack you're working with.
- Any end-user, if they get the source code, will need to do those build steps themselves. Please don't say that end-users should just download the precompiled
  binaries. What if I don't trust the distributor?
- Even though it's hidden, and I don't have to deal with these extra steps, why is there a need for generating build commands? For platform independence?
  You can have that by switch cases in any good enough language! Your compiler tells you about the host OS, CPU, and other important facts.
- It's too complex for small projects! I'd really like to use something that I can hack to work with my project if required.

Now, I'm not really saying that these build systems are bad. These are not meant for small projects in my opinion. I have't worked on
a very big project as a solo developer, so my comments on that will be not really useful, even for myself.

## What It Should Be Like

The whole and sole purpose of engineering is making our lives easy! Every other directives derive from this simple requirement. So, what do
we end up complicating things? It's in human nature ig. In my opinion, there are a few options to build any project can follow :

- Use a platform specific scripting language like `bash` or `powershell` 
- Use the language you use in project. In my case C.

For the last option, you'd require some setup, if it's not already available. In my case, I followed the third option, because it requires very
less setup. You already need a compiler to build your project. You can use the same compiler to bootstrap your build system and use it to then
build the complete project. If any of the above option is followed, then building a project will look like this :

- In the project directory, run the build script, or compile a single source code to bootstrap your build system, and then run it.

That's it! Running build script is the easiest in use case, but developers will probably need maintaining many different platform-specific scripts for this.
But it's easier to build the project with this! In the other case, if you use the same langauge to build your project, and if it's a compiled one,
then you'd need to bootstrap the build system, which is easy, because we already have all the tools required.

## Introducing SelfStart

I made my own build system (kind-of), which I named SelfStart in the sense that vehicles have a self-start button, to start the machine, without
manual effort from your side. This is how it works :

- I have a main build program source present at the project. It's the only single one. Unlike `Makefile` or `CMake`, you are not supposed to have
  multiple scripts/programs in each directory recursively. Why split out the build code? It just splits up and hides things, from users. To have
  transparency, this looks good to me. Also, easier to maintain, just change build parameters in one single file. You can have this in any build
  system though, but mine, kind-of forces you to do this.
- Bootstrap the build system using `gcc SelfStartMain -o SelfStartMain.c` and then run it any number of times using `./SelfStartMain` from project
  root directory.

Any subsequent calls to `SelfStartMain` will automatically re-compile the build binary (`SelfStartMain`), so it has up-to-date build commands,
and then build the project as if it's a clean build. The interesting part is that in case of C projects, clean build time is often very very fast.
A single source program will compile within milliseconds.

### How Does It Work In Code?

Let's begin with outer layer, and then slowly dive into internals (which there isn't much). Following the source code for build program.

```c
#include "SelfStart/SelfStart.h"

SELF_START ({
    ADD_LIBRARY (
        "ctStd",
        SOURCES (
            "Source/Misra/Std/Log.c",
            "Source/Misra/Std/File.c",
            "Source/Misra/Std/Container/Vec.c",
            "Source/Misra/Std/Container/Str.c"
        ),
        NO_LIBRARIES,
        FLAGS ("-ggdb", "-fPIC")
    );

    ADD_EXECUTABLE ("battic", SOURCES ("Main.c"), LIBRARIES ("ctStd"), FLAGS ("-ggdb", "-fPIC"));
});
```

Every project that wants to use it must have it in the project root, and all build commands will be written here.

### Does It Generate You Build Commands?

Yes! Out of the box!. That's what these macros are for. I had to hide the ugly way in which I generate build commands, but anyone
can take a look at the definitions here, it's easy to understand IMO :

### Build Command Macros

```c
///
/// Wrapper around the AddExecutable command. Always use this instead of the command directly.
/// This will help generate the compile_commands.json automatically.
///
#define ADD_EXECUTABLE(exec_name, src_names, lib_names, cflags)                                    \
    ccj = AddExecutable (exec_name, src_names, lib_names, cflags, ccj)

#define ADD_LIBRARY(lib_name, src_names, lib_names, cflags)                                        \
    ccj = AddLibrary (lib_name, src_names, lib_names, cflags, ccj)

#define SELF_START(body)                                                                           \
    int main (int argc, char** argv, char** envp) {                                                \
        /* always rebuild self before starting */                                                  \
        RebuildSelf (argc, argv, envp);                                                            \
                                                                                                   \
        /* start compile commands json string */                                                   \
        const char* ccj = Appendf (NULL, "[", " ");                                                \
                                                                                                   \
        {body}                                                                                     \
                                                                                                   \
        /* end compile commands json */                                                            \
        ccj = Appendf (ccj, "]");                                                                  \
                                                                                                   \
        /* write to compile_commands.json */                                                       \
        WriteToFile ("compile_commands.json", ccj);                                                \
                                                                                                   \
        free ((void*)ccj);                                                                         \
    }
```

The `ccj` string stores the `compile_commands.json` output, which is passed to the actual build commands, and then 
returned by them.
