---
title: Defeating Anti-VM and Anti-Debug
description: Solution for ReverseMe3 from crackmes[.]one
date: 2022-12-09T13:18:43.322Z
draft: false
---
You can get the challenge binary from [here](https://crackmes.one/crackme/5fb1642933c5d424269a1850).

T﻿his is another awesome challenge from crackmes.one. The binary is able to run properly in specific builds of Windows 10. When run under a debugger, it closes and when run under a VM it probably crashes. So, to solve this crackme, we have to make it run under VM and Debugger, in other words : Defeat the Anti-VM and Anti-Debug.

This is a good crackme and I'd like you to read this writeup only after giving it a proper try. Otherwise, mostly you won't be able to understand what I'm talking about!

I wrote a script to patch the given binary and create a new patched binary. For Anti-VM, the binary uses cpuid instruction with leaf 0x40000000. It then uses the value in lowest byte in ecx register returned by cpuid instruction to xor decrypt some code. If we find the correct key then we defeat the Anti-VM. Since, I'm running this instruction under a VM, the value stored in eax, ebx, ecx and edx registers are not correct.

T﻿hrere are two methods to get the correct key :

* Create a program to get the cpuid value for leaf 0x40000000 and run it on host. Get the corresponding values and set those values manually after cpuid is called. Or we can patch the binary too!
* B﻿ruteforce this key with the given data being decrypted. We can use pwntools and pefile to create disassembly and read PE file.

T﻿he second method is more reliable than first one. But first one is much faster.

I﻿ created a C program to get values for the cpuid instruction.

```ags
#include <stdio.h>

// reference :
// https://stackoverflow.com/questions/6491566/getting-the-machine-serial-number-and-cpu-id-using-c-c-in-linux

static inline void native_cpuid(unsigned int *eax, unsigned int *ebx,
                                unsigned int *ecx, unsigned int *edx)
{
    /* ecx is often an input as well as an output. */
    asm volatile("cpuid"
                 : "=a" (*eax),
                   "=b" (*ebx),
                   "=c" (*ecx),
                   "=d" (*edx)
                 : "0" (*eax), "2" (*ecx));
}

int main(int argc, char **argv) {
    unsigned eax, ebx, ecx, edx;

    eax = 0x40000000; /* processor info and feature bits */
    native_cpuid(&eax, &ebx, &ecx, &edx);

    printf("EAX = 0x%08x\n",eax);
    printf("EBX = 0x%08x\n",ebx);
    printf("ECX = 0x%08x\n",ecx);
    printf("EDX = 0x%08x\n",edx);

    return 0;
}
```

R﻿unning this gives ecx = 0x64 (on my machine). I asked my friends too, to run the program and give the the outputs they recieved because I was wondering maybe this value depends on OS too. The value they got is actually different that the value I get. For them, all the registers were filled with 0. This is clearly incorrect because xor with 0 is identity.

I﻿ also created a bruteforce script to clear my suspicion.

```python
#!/usr/bin/env python3

# Reference : https://bufferoverflows.net/exploring-pe-files-with-python/

import pefile
import pwn

# load pe file
pe = pefile.PE("./ReverseMe3.EXE")
pe.print_info()

# print section information
for section in pe.sections:
    print(section.Name.decode().rstrip('\x00') +\
          "\n|\n|---- Vitual Size : " + hex(section.Misc_VirtualSize) +\
          "\n|\n|---- VirutalAddress : " + hex(section.VirtualAddress) +\
          "\n|\n|---- SizeOfRawData : " + hex(section.SizeOfRawData) +\
          "\n|\n|---- PointerToRawData : " + hex(section.PointerToRawData) +\
          "\n|\n|---- Characterisitcs : " + hex(section.Characteristics)+'\n')
print("*" * 50)

# load binfile into array
binfile = open('./ReverseMe3.EXE', 'rb')
bindata = binfile.read()
binfile.close()

# set architecture
pwn.context.arch = 'amd64'

entry_va = 0x401000 # virtual address of entry point
codestart_pa = pe.sections[0].PointerToRawData # physical address of entry point in binary
codestart = codestart_pa
codelen = 0x258 # length of code to decrypt
xor_offset = 0x30 # length after which program starts xorring

# code uses xor decryption
bindata = list(bindata)
for key in range(255):
    for i in range(codelen):
        bindata[codestart + xor_offset + i] ^= key
    code = pwn.disasm(bytearray(bindata[codestart:codestart+codelen]))
    if('(bad)' not in code):
        print(f'******************************* key = {hex(key)} ***********************************')
        print(code)
```

Check for valid disassembly in this. I got 0x64 to be the valid key. I then created a script to decrypt this and patch the binary.

```python
#!/usr/bin/env python3

# Reference : https://bufferoverflows.net/exploring-pe-files-with-python/

import pefile
import pwn

# load pe file
pe = pefile.PE("./ReverseMe3.EXE")
pe.print_info()


# print section information
for section in pe.sections:
    print(section.Name.decode().rstrip('\x00') +\
          "\n|\n|---- Vitual Size : " + hex(section.Misc_VirtualSize) +\
          "\n|\n|---- VirutalAddress : " + hex(section.VirtualAddress) +\
          "\n|\n|---- SizeOfRawData : " + hex(section.SizeOfRawData) +\
          "\n|\n|---- PointerToRawData : " + hex(section.PointerToRawData) +\
          "\n|\n|---- Characterisitcs : " + hex(section.Characteristics)+'\n')
print("*" * 50)

# load binfile into array
binfile = open('./ReverseMe3.EXE', 'rb')
bindata = binfile.read()
binfile.close()

# set architecture
pwn.context.arch = 'amd64'

entry_va = 0x401000 # virtual address of entry point
codestart_pa = pe.sections[0].PointerToRawData # physical address of entry point in binary
codestart = codestart_pa
codelen = 0x258 # length of code to decrypt
xor_offset = 0x30 # length after which program starts xorring
key = 0x64

# code uses xor decryption
bindata = list(bindata)
for i in range(codelen):
    bindata[codestart + xor_offset + i] ^= key

# patch unnecessary instructions with nop bytes
codestart_va = 0x401014
codestop_va =  0x401030
codelen = codestop_va - codestart_va
codestart += codestart_va - entry_va

# patch with 0x90 to be able to continue the execution
for i in range(codelen):
    bindata[codestart + i] = 0x90 # nop instruction

# save patched binary
bindata = bytearray(bindata)
binfile = open('./patch1.exe', 'wb')
binfile.write(bindata)
binfile.close()
```

N﻿ext after analyzing the newly decrypted code, we can see that the program is creating a new thread. This thread is hidden from debugger (as the flags specifies). You can also find the thread entry if you look closely!

I﻿n the new thread, the program is checking whether this is Windows 10 or not. If it is then it's checking the build version. For a specific build version, it continues execution otherwise it terminates the thread. Then a new thread information is set to hide this thread from debugger. If the previous step succeeds then execution is continued, or a new debug object is created. Now since the program is already running under a debugger, a new debug object creation will fail! This will crash the current thread and this is the Anti-Debug.

D﻿efeating this is quite hard because after creating a debug object, it queries information from it to correct it's decryption key. The program contains a wrong decryption key. This decryption key is used to xor decrypt another code section that is responsible to display that window we want. If we somehow get this key, decrypt this encrypted code and patch the whole binary again, we will defeat Anti-Debug.

F﻿inding the correct decryption key depends on two values. For the second one the value has to be 1 because hiding from debugger flag was set by the program and if it's running fine then that flag has to be set all the time. For the first one, I preferred guessing because I was already too exhaused and there were like only 26 possible values to guess from. I started with 0 and found 1 to be the correct value. I again created a final script to perform all this patching and decryption and what not to get the binary working under debugger and vm.

```python
#!/usr/bin/env python3

# Reference : https://bufferoverflows.net/exploring-pe-files-with-python/

import pefile
import pwn

# load pe file
pe = pefile.PE("./ReverseMe3.EXE")
pe.print_info()


# print section information
for section in pe.sections:
    print(section.Name.decode().rstrip('\x00') +\
          "\n|\n|---- Vitual Size : " + hex(section.Misc_VirtualSize) +\
          "\n|\n|---- VirutalAddress : " + hex(section.VirtualAddress) +\
          "\n|\n|---- SizeOfRawData : " + hex(section.SizeOfRawData) +\
          "\n|\n|---- PointerToRawData : " + hex(section.PointerToRawData) +\
          "\n|\n|---- Characterisitcs : " + hex(section.Characteristics)+'\n')
print("*" * 50)

# load binfile into array
binfile = open('./ReverseMe3.EXE', 'rb')
bindata = binfile.read()
binfile.close()

# set architecture
pwn.context.arch = 'amd64'

entry_va = 0x401000 # virtual address of entry point
codestart_pa = pe.sections[0].PointerToRawData # physical address of entry point in binary
codestart = codestart_pa
codelen = 0x258 # length of code to decrypt
xor_offset = 0x30 # length after which program starts xorring
key = 0x64

# code uses xor decryption
bindata = list(bindata)
for i in range(codelen):
    bindata[codestart + xor_offset + i] ^= key

# patch unnecessary instructions with nop bytes
# we want the debug object to be created
codestart_va = 0x401014
codestop_va =  0x401201
codelen = codestop_va - codestart_va
codestart += codestart_va - entry_va

for i in range(codelen):
    bindata[codestart + i] = 0x90 # nop instruction

key = bytearray(b'1c4TLKe6Px8M2fN7iAlC') # xor decryptor key
keylen = 20 # key length
patch_va = 0x401288 # va to start patching from
patch_len = 0x143 # length of code to be patched
codestart = codestart_pa
codestart += (patch_va - entry_va) # physical address in file to start patching from

# create correct flag
guess_value = 1
key[4] = 0x41 + guess_value
key[-1] = 0x41 + 1 + 0xe + guess_value

print(f"USING KEY : {str(key)}")
print(f"PATCHING FROM ADDRESS { hex(patch_va) } WITH PATCH LENGTH { hex(patch_len) } AND PHYSICAL ADDRESS { hex(codestart) }")

for j in range(patch_len):
    bindata[codestart + j] ^= key[j%keylen]

# save patched binary
bindata = bytearray(bindata)
binfile = open('./patched.exe', 'wb')
binfile.write(bindata)
binfile.close()
```

R﻿un this script with proper file paths and it'll give you the patched binary. Another CrackMe solved!

I﻿'ll meet you in another solution post! Till then, keep learning and keep reversing :-)
