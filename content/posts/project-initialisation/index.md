---
author: "Siddharth Mishra"
title: "Project Initialisation"
date: "2022-01-08"
description: "Setting Up The MisraOS Kernel With Limine & stivale2"
draft: false
tags:
  [
  "osdev",
  "misraos",
  "kernel",
  "c",
  "cmake",
  "limine"
  ]
---

We'll use [limine](https://github.com/limine-bootloader/limine) bootloader and use stivale2 as our boot protocol. There are multiple boot protocols and stivale2 provides many advanced features. Limine supports stivale2 by default. It also gives us a way to instantly print anything on screen but we won't be using that.
To read more about stivale2 boot specification, read [here](https://github.com/stivale/stivale/blob/master/STIVALE2.md)

Create project with following directory structure
```bash
.
├── CMakeLists.txt
├── kernel
│   ├── kernel.c
│   ├── kernel.h
│   └── stivale2.h
└── limine
    ├── bochsrc
    ├── build-aux
.
.
.

19 directories, 183 files
```

`kernel` will contain our kernel code. Soon we'll be creating many other folders. Use `wget` to get [stivale2](https://raw.githubusercontent.com/stivale/stivale/master/stivale2.h) header file. Initialise a git repository and add [limine](https://github.com/limine-bootloader/limine) boot loader as a `submodule`.

Contents of `CMakeLists.txt` are :
```cmake
# cmake settings
cmake_minimum_required(VERSION 3.5)

# project settings
project(misraos VERSION 0 LANGUAGES C)
```

Contents of `kernel.h` are :
```c
#ifndef KERNEL_H_
#define KERNEL_H_

// we can't include most of the headers
// only selected headers ans others require libc
// which we won't have when our kernel boots up
#include <stdint.h>
#include <stddef.h>

// stivale 2 header specification
#include "stivale2.h"

// placeholder for NULL value in uintptr_t instead of using 0 again and again
#define NULLADDR 0

#endif // KERNEL_H_
```

Taking [this](https://wiki.osdev.org/Stivale_Bare_Bones) as reference we will initialise our base kernel.

Let's start working on our `kernel.c` as this will contain our kernel's entry point. Copy and paste the following code into it and try to understand through the comments.
```c
#include "kernel.h"

// we cannot dynamically allocate anything now
// so will initialize stack as an array in .bss and tell stivale
// where our stack is
static uint8_t stack[8192]; // 8kb stack

// we need a framebuffer from stivale on bootup so we
// need to tell stivale that we need a framebuffer instead of
// CGA-compatible text mode.
static struct stivale2_header_tag_framebuffer framebuffer_hdr_tag = {
    .tag = {
        // which type of tag is this
        .identifier = STIVALE2_HEADER_TAG_FRAMEBUFFER_ID,
        // this must be a pointer address, NULL in this case
        .next = NULLADDR
    },
    // set all framebuffer specifics to 0 and let bootloader decide
    .framebuffer_width = 0,
    .framebuffer_height = 0,
    .framebuffer_bpp = 0
};

// The stivale2 specification says we need to define a "header structure".
// This structure needs to reside in the .stivale2hdr ELF section in order
// for the bootloader to find it. We use this __attribute__ directive to
// tell the compiler to put the following structure in said section.
__attribute__((section(".stivale2hdr"), used))
static struct stivale2_header stivale_hdr = {
    // The entry_point member is used to specify an alternative entry
    // point that the bootloader should jump to instead of the executable's
    // ELF entry point. We do not care about that so we leave it zeroed.
    .entry_point = NULLADDR,
    // Let's tell the bootloader where our stack is.
    // We need to add the sizeof(stack) since in x86(_64) the stack grows
    // downwards.
    .stack = (uintptr_t)stack + sizeof(stack),
    // Bit 1, if set, causes the bootloader to return to us pointers in the
    // higher half, which we likely want since this is a higher half kernel.
    // Bit 2, if set, tells the bootloader to enable protected memory ranges,
    // that is, to respect the ELF PHDR mandated permissions for the executable's
    // segments.
    // Bit 3, if set, enables fully virtual kernel mappings, which we want as
    // they allow the bootloader to pick whichever *physical* memory address is
    // available to load the kernel, rather than relying on us telling it where
    // to load it.
    // Bit 4 disables a deprecated feature and should always be set.
    .flags = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4),
    // This header structure is the root of the linked list of header tags and
    // points to the first one in the linked list.
    .tags = (uintptr_t)&framebuffer_hdr_tag
};


// We will now write a helper function which will allow us to scan for tags
// that we want FROM the bootloader (structure tags).
void *stivale2_get_tag(struct stivale2_struct *stivale2_struct, uint64_t id) {
    struct stivale2_tag *current_tag = (void *)stivale2_struct->tags;
    for (;;) {
        // If the tag pointer is NULL (end of linked list), we did not find
        // the tag. Return NULL to signal this.
        if (current_tag == NULL) {
            return NULL;
        }

        // Check whether the identifier matches. If it does, return a pointer
        // to the matching tag.
        if (current_tag->identifier == id) {
            return current_tag;
        }

        // Get a pointer to the next tag in the linked list and repeat.
        current_tag = (void *)current_tag->next;
    }
}

// The following will be our kernel's entry point.
void _start(struct stivale2_struct *stivale2_struct) {
    // Let's get the terminal structure tag from the bootloader.
    // notice this is struct_tag and previous one was header_tag
    // struct_tags are returned by bootloader and header_tags are used to request features from bootloader
    struct stivale2_struct_tag_framebuffer *framebuffer_tag;
    framebuffer_tag = stivale2_get_tag(stivale2_struct, STIVALE2_STRUCT_TAG_FRAMEBUFFER_ID);

    // Check if the tag was actually found.
    if (framebuffer_tag == NULL) {
        // It wasn't found, just hang...
        for (;;) {
            asm ("hlt");
        }
    }

    // get address of framebuffer
    uint32_t* fb_addr = (uint32_t*)framebuffer_tag->framebuffer_addr;

    // We're done, just hang...
    for (;;) {
        asm ("hlt");
    }
}
```

And I'll just copy-paste the linker script mentioned in the reference link from osdev wiki I gave above.

```lds
/* Tell the linker that we want an x86_64 ELF64 output file */
OUTPUT_FORMAT(elf64-x86-64)
OUTPUT_ARCH(i386:x86-64)
 
/* We want the symbol _start to be our entry point */
ENTRY(_start)
 
/* Define the program headers we want so the bootloader gives us the right */
/* MMU permissions */
PHDRS
{
    null    PT_NULL    FLAGS(0) ;                   /* Null segment */
    text    PT_LOAD    FLAGS((1 << 0) | (1 << 2)) ; /* Execute + Read */
    rodata  PT_LOAD    FLAGS((1 << 2)) ;            /* Read only */
    data    PT_LOAD    FLAGS((1 << 1) | (1 << 2)) ; /* Write + Read */
}
 
SECTIONS
{
    /* We wanna be placed in the topmost 2GiB of the address space, for optimisations */
    /* and because that is what the stivale2 spec mandates. */
    /* Any address in this region will do, but often 0xffffffff80000000 is chosen as */
    /* that is the beginning of the region. */
    . = 0xffffffff80000000;
 
    .text : {
        *(.text .text.*)
    } :text
 
    /* Move to the next memory page for .rodata */
    . += CONSTANT(MAXPAGESIZE);
 
    /* We place the .stivale2hdr section containing the header in its own section, */
    /* and we use the KEEP directive on it to make sure it doesn't get discarded. */
    .stivale2hdr : {
        KEEP(*(.stivale2hdr))
    } :rodata
 
    .rodata : {
        *(.rodata .rodata.*)
    } :rodata
 
    /* Move to the next memory page for .data */
    . += CONSTANT(MAXPAGESIZE);
 
    .data : {
        *(.data .data.*)
    } :data
 
    .bss : {
        *(COMMON)
        *(.bss .bss.*)
    } :data
}
```

And use this modified builder script : 

```sh
#!/usr/bin/env bash

# create sys_root directory structure
# root of our operating system
mkdir -pv sys_root
# contains bootloader related files
mkdir -pv sys_root/boot

# remove previous kernel
rm sys_root/boot/kernel

# build os
mkdir -pv build
cd build
# take any changes in account
cmake ..
# build
make -j8
# install will keep the build files in build directory only
# we will need to copy those files from here to sys_root
make install
cd ..

# remove previous misra.hdd
rm misra.hdd

# Create an empty zeroed out 64MB misra.hdd file.
# block size is 1 MB (read/write bytes at once)
dd if=/dev/zero bs=1M count=0 seek=64 of=misra.hdd

# Create a GUID partition table.
# -s is --script : this never prompts for user intervention
parted -s misra.hdd mklabel gpt

# Create an EFI System Partition (ESP) that spans the whole disk.
parted -s misra.hdd mkpart ESP fat32 2048s 100%
# set ESP flag "on" for partition 1 on misra.hdd
parted -s misra.hdd set 1 esp on

# Build limine-install.
make -C limine

# Install the Limine BIOS stages onto misra
limine/build/bin/limine-install misra.hdd

# Mount the loopback device.
# The loop device is a block device that maps its data blocks
# not to a physical device such as a hard disk or optical disk
# drive, but to the blocks of a regular file in a filesystem
# or to another block device
#
# partscan forces the kernel to scan the partition table for newly
# created loop device.
# find the first unused loop device and if a file argument is present
# (in our case misra.hdd) use it as loop device
# show the name of the assigned loop device (--find [file] must be present)
USED_LOOPBACK=$(sudo losetup --partscan --find misra.hdd --show)

# Format the ESP partition (partition 1 : p1) as FAT32.
sudo mkfs.fat -F 32 ${USED_LOOPBACK}p1

# Create directory for mounting misra.hdd
mkdir -p disk_root
# mount hdd so that we can directly copy/paste files into it
sudo mount ${USED_LOOPBACK}p1 disk_root

# copy kernel
cp -v build/kernel/kernel sys_root/boot/kernel
# copy bootloader related file
mkdir -pv sys_root/boot/EFI
mkdir -pv sys_root/boot/EFI/BOOT
cp -v limine/build/bin/BOOTX64.EFI sys_root/boot/EFI/BOOT/
# copy limine config
cp -v limine.cfg limine/build/bin/limine.sys sys_root/boot/

# Copy the relevant files over
sudo cp -v sys_root/* disk_root/ -r

# Sync system cache and unmount partition and loopback device.
sync
sudo umount disk_root
sudo losetup -d ${USED_LOOPBACK}
```
 
We will use parted for creating our hard drive and use `limine-install` binary to install limine on our newly created hard drive. The `limine-install` command is analogous to `grub-install` when installing linux. For manual on parted, refer to [this](https://www.gnu.org/software/parted/manual/parted.html).

Few lines taken from wikipedia : 
> The EFI (Extensible Firmware Interface) system partition or ESP is a partition on a data storage device (usually a hard disk drive or solid-state drive) that is used by computers having the Unified Extensible Firmware Interface (UEFI). When a computer is booted, UEFI firmware loads files stored on the ESP to start installed operating systems and various utilities.

> An ESP contains the boot loaders or kernel images for all installed operating systems (which are contained in other partitions), device driver files for hardware devices present in a computer and used by the firmware at boot time, system utility programs that are intended to be run before an operating system is booted, and data files such as error logs.


When we build our OS, particular files need to be in special directories (as in other OS filesystems). `sys_root` is our `/` (from linux user's perspective) and `C:/` (from windows user's perspective). Files related to bootloader will go in `sys_root/boot`. This `sys_root` folder will contain all build files and will be used when our OS boots. This means, files like C/C++ includes, utility binaries, config files needed inside our OS etc will be in this `sys_root`. I hope you get the idea :-).

We'll test our OS as a virtual machine because for now we don't know what will happen when we boot it as host and also because we don't want to reset our PC again and again to test just a small change.

Running the script won't work just now as we need a few more things. Add a `CMakeLists.txt` in kernel directory and paste the following contents in it : 
```cmake
set(KERNEL_SRCS "kernel.c")

# make kernel as executable
add_executable(kernel ${KERNEL_SRCS})

# set compile options
target_compile_options(kernel PRIVATE    -Wall -Wextra -O2
                                        -ffreestanding
                                        -fno-stack-protector
                                        -fno-pic -fpie
                                        -mgeneral-regs-only
                                        -fno-exceptions
                                        -mno-red-zone)
# set linker options
target_link_options(kernel PRIVATE  -fno-pic -fpie
                                    # this must be a comma separated list
                                    -Wl,-static,-pie,-ztext--no-dynamic-linker
                                    -static-pie
                                    -nostdlib
                                    -T${CMAKE_CURRENT_SOURCE_DIR}/linker.ld
                                    -z max-page-size=0x1000)

# set_target_properties(kernel PROPERTIES PUBLIC_HEADER "stivale2.h")

# add install rules for this include dir
# install(TARGETS kernel PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_PREFIX}/kernel)
```

Add a new line to project root's `CMakeLists.txt`:
```cmake
# other code
...

# build kernel
add_subdirectory(kernel)
```

Create a new file named `limine.cfg` in project root with following contents:
```cfg
# Timeout in seconds that Limine will use before automatically booting.
TIMEOUT=5

# The entry name that will be displayed in the boot menu
:Misra

# Change the protocol line depending on the used protocol.
PROTOCOL=stivale2

# Path to the kernel to boot. boot:/// represents the partition on which limine.cfg is located.
# our kernel is located in sys_root/boot/kernel and sys_root will be copied to partition 1
KERNEL_PATH=boot:///boot/kernel

# Remove the following line to enable kernel address layout randomisation.
# we don't want ASLR for now
KASLR=no
```

Now try running the builder script. Next do the following to run your OS. If everything is working fine then you will se a menu where only one element is in the list and that is our OS's name "Misra" (configured in `limine.cfg`) and when system boots up, it'll halt. A complete black blank screen. 
```sh
>>> qemu-system-x86_64 misra.hdd
```

To be sure let's do one more thing, let's fill some colour in our framebuffer and check if we can see it or not.

```c
// other code
...

// The following will be our kernel's entry point.
void _start(struct stivale2_struct *stivale2_struct) {
  // Let's get the terminal structure tag from the bootloader.
    struct stivale2_struct_tag_framebuffer *framebuffer_tag;
    framebuffer_tag = stivale2_get_tag(stivale2_struct, STIVALE2_STRUCT_TAG_FRAMEBUFFER_ID);

    // Check if the tag was actually found.
    if (framebuffer_tag == NULL) {
        // It wasn't found, just hang...
        for (;;) {
            asm ("hlt");
        }
    }

    // get address of framebuffer
    uint32_t* fb_addr = (uint32_t*)framebuffer_tag->framebuffer_addr;
    uint32_t fb_width = framebuffer_tag->framebuffer_width;
    uint32_t fb_height = framebuffer_tag->framebuffer_height;

    // fill framebuffer
    for(size_t i = 0; i < fb_width * fb_height; i++){
        fb_addr[i] = 0xcafebabe;
    }

    // We're done, just hang...
    for (;;) {
        asm ("hlt");
    }
}
```

If everything is working fine then you'll see a pleasant color occupying the whole window.

# *Initialisation Complete!*
