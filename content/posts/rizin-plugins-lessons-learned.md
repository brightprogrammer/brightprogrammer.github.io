---
author: "Siddharth Mishra"
title: "Creating Rizin Plugins - Lessons Learned"
date: "2025-03-25"
description: "Nectar of lessons learned after working on a Rizin plugin for past ten months"
tags:
  [
    "rizin",
    "cutter",
    "plugin",
    "build-system",
    "tooling",
    "build-tool",
    "windows",
    "linux",
    "mac",
    "shell-scripting",
    "powershell",
    "bash",
  ]
---

# Introduction

I've been developing and maintaining a [Rizin](https://github.com/rizinorg/rizin) plugin for past ten months for a
startup, [RevEngAI](https://reveng.ai). The plugin is used to communicate with RevEngAI servers to upload binaries
you're analyzing in Rizin/Cutter and then perform an AI based analysis in the background, and then retrieve the analysis
results back from the servers and apply the results to Rizin's own analysis. The number of features keep growing day
by day as the team works on improving their product.

This post will cover the challenges I faced while writing the plugin, and what I did to overcome those challenges.
Although it is not ideally possible to cover all the challenges, I'm making sure that I jot down at least the ones
that you'll probably face if you wish to write a plugin that works on all three major OS platforms (Windows, Linux & Mac).

![](/images/revengai-rizin-plugin-ss.png)

# Rizin & Plugins

Rizin has a very nice architecture of using plugins for almost everything. Even the original source code comes with a lot
of plugins that the developers ship with the tool, out of the box. This modular architecture allows anyone to add new features
any some important stages of Rizin analysis without changing the actual code. Honestly, this is an expected feature in any
well known tool like this, because reverse engineers often need to write their own analysis when dealing with some obscure
binaries. IDA Pro and Ghidra as well provide it's users a way to augment it's functionality by writing new plugins.

## Types Of Plugins

| Category   | Description                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| ASM        | Assembly & Disassembly of opcodes retrieved from binary data.                                                            |
| Analysis   | Uplift ASM to an IL and then perform analysis on it.                                                                     |
| Parse      | Disassembly code parsing.                                                                                                |
| Binary     | Parsing different binary formats (ELF, PE/PE32, MACH-O, or some new obscure format you encounter in a CTF or real life). |
| BinXtr     | Extract some data from binary files.                                                                                     |
| Breakpoint | To identify breakpoint bytes within an architecture.                                                                     |
| Core       | General plugins. Initializer is called before any other plugin.                                                          |
| Crypto     | Crypto algorithms for hashing mostly.                                                                                    |
| Debug      | Setup connections with a debugger outside rizin like GDB, WinDBG, etc.                                                   |
| Egg        | For working with raw assembly bytes, shellcode, etc.                                                                     |
| IO         | Input/output. Wanna add support for a new protocol to read files? This one got you!                                      |
| Lang       | Scripting languages in rizin.                                                                                            |
| Hash       | Hashing algorithms support.                                                                                              |
| Demangler  | Name demangling for mangled names loaded from binaries or other sources.                                                 |

## Default Plugins

As I said, the developers ship with lots of plugins for each of these types themselves. This idea allows anyone to
spin up their own plugin by simply adding their plugin code into rizin itself and building the whole project. This
however is the best option only when you're the only one who's going to use this plugin, otherwise you ship it
separately outside of source code.

To get more idea about how these different plugins work, or to just read their code, you can go to [`librz`](https://github.com/rizinorg/rizin/tree/dev/librz) folder
in [Rizin](https://github.com/rizinorg/rizin)'s source code and navigate to `p` directory in all these folders, `p` meaning plugin.

![](/images/rizin-hash-plugins-src.png)

# How To Write One?

Writing plugins for rizin is very easy. There are different language options you can write your plugin in, but I'll only
explain how to write it in C, because that's what I chose and that's what is most guaranteed to work out of the box on
any platform rizin can run on.

To create a new plugin, you first need to decide the purpose. Then corresponding to that decide which plugin type will
work best for you. Then you need to find which structure Rizin uses to represent this plugin. This can be done by doing
a simple search for the word `Plugin`.

![](/images/rizin-plugin-types-search-result.png)

Once the plugin struct is in your knowledge, in your plugin source code initialize that struct in global scope with
all the fields and then create a new `RzLibStruct` variable in global scope like the following

```c
#ifdef _MSC_VER
#    define RZ_EXPORT __declspec (dllexport)
#else
#    define RZ_EXPORT
#endif

#ifndef CORELIB
RZ_EXPORT RzLibStruct rizin_plugin = {
    .type    = RZ_LIB_TYPE_CORE,
    .data    = &core_plugin_reai,
    .version = RZ_VERSION,
};
#endif
```

or by simply copy-pasting code from Rizin's own plugin source code

```c
#ifndef RZ_PLUGIN_INCORE
RZ_API RzLibStruct rizin_plugin = {
	.type = RZ_LIB_TYPE_EGG,
	.data = &rz_egg_plugin_bind,
	.version = RZ_VERSION
};
#endif
```

Either of the above will work with correct plugin `type` and `data`. As I said, you have many many examples of already
existing plugins in Rizin's source code itself. The data variable is a global instance of the plugin struct you decided
upon earlier, initialized with correct fields. The plugin I wrote is a `RzCorePlugin` and looks like this :

```c
/* plugin data */
RzCorePlugin core_plugin_reai = {
    .name    = "reai_rizin",
    .author  = "Siddharth Mishra",
    .desc    = "RevEng.AI Rizin Analysis Plugin",
    .license = "Copyright (c) 2024 RevEngAI. All Rights Reserved.",
    .version = "v1+ai_decomp:feb6",
    .init    = (RzCorePluginCallback)rz_plugin_init,
    .fini    = (RzCorePluginCallback)rz_plugin_fini,
};
```

# Working

When Rizin starts, it searches for paths where plugins are present. There are different paths for user plugins,
and for those that come along with the installation itself. On startup, Rizin will attempt to load all these plugins
from these directory paths and will search for `rizin_plugin` variable in the loaded library (`DLL` or `so`) file.
If a valid pointer to this variable is found then that library file is recognized as a rizin plugin.

Now, no matter what plugin type you write, it'll always have this `RzLibStruct` and it's structure we already know
for sure. So you just typecast the retrieved pointer to this struct pointer type and then from there on make decision
on the type of plugin, it's Initializer, deinitializer and other functions (depending on the plugin type).

This is the general principle of how any plugin works in almost any software you see.

# Plugin Commands

Rizin has a very nice way of adding new and managing commands. This feature however is not so easily available outside
of Rizin's source code itself. So, while writing my plugin, I extracted this feature outside of Rizin to work with
my plugin as well. This allows me to just modify some YAML files to add new commands. Source code can be found
in [My plugin's source code](https://github.com/RevEngAI/reai-rz/tree/master/Source/Rizin/CmdGen)

Anyone can use this code for their own use, by agreeing to the license at the top of the source code. This `CmdGen` works
by calling a modified python script (taken from Rizin's original source code) at runtime, on my own YAML files and then
generating a `.c` and a `.h` file that is quite hard to write by hand, and that much less maintainable as well. It is completely
possible however to write it by hand.

| ![](/images/rizin-plugin-cmdgen-output-code.png) |
| ------------------------------------------------ |
| <center> code generated by cmdgen </center>      |

# Building Across Systems

## On Linux & Mac

Building on Linux was the easiest. Everything just works. You just need to take care of file system
if your plugin ever interacts with files. My plugin does. It has to read a config file to load some
plugin related data at startup. Different users might have slightly different file systems. Don't ever
hardcode file paths until unless you're absolutely sure it'll work across all machines.

Mac only differs slightly from Linux and you'll need negligible effort to make it work on Mac once you
have it working on Linux. Once you got it working on linux, you can consider making a `Dockerfile`
to allow users to try your plugin without actually changing anything on their host machine.

## Building On Windows (Madness & Methods)

### Rant

Building anything native on Windows is an absolute PITA. Microsoft expects you to download a 25GB toolchain
just to get a compiler. Thanks to open source you can always ditch MSVC (Microsoft's own C/C++ Compiler toolchain).
On Linux and Mac, your IDE is your terminal. Windows, even though surprisingly has a really powerful scripting language
and a great terminal, fails to do anything for the developers here.

### Introspection

This might be my own fault as well, because I lack Windows development experience.

### The Real Juice

I made my plugin work by writing a powershell script to fetch all dependencies. Install pre-built binaries
in a dedicated folder, building the ones I need and installing those as well to the dedicated install directory,
and then finally building the plugin.

It took me almost three weeks worth of time to make this work from scratch. Initially I spent my time making it
work with MSVC then I realized MSVC is dog shit. Source code of this powershell script can be found in my plugin
repo.

Now the whole plugin builds in almost seven to eight minutes from scratch.

# Extra Comments

- Try to keep dependencies as minimum as possible.
- The CMake code from my already existing plugin can be hacked into your own to make it work across systems.
- `printf` debugging helps.
