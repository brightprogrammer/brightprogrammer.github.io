---
title: One Instruction Set Computers (OISC) - Elvis Magic Box
date: 2023-01-29 11:53:46
tags: ['crackmes', 'reverse-engineering', 'windows', 'oisc', 'vm']
categories: ['crackmes', 'windows']
---

![Wikipedia's take on OISC](/images/evmbcm-wikipedia-oisc-ss.png)

_**THIS WRITEUP IS VERY VERY LONG AND MOST OF THE PART IS NOT ACTUALLY RELATED TO THE VM. YOU CAN SKIP TO THE “*THE MOMENT OF TRUTH*” TO ACTUALLY READ THE SOLUTION.**_

After completing the [previous](/2023/01/06/Self-Debugging-Nanomite-Elvis-Protected-Crackme/) CrackMe based on a very good Anti-Debug technique (which can be further improved as I pointed out in that post by reading a research paper), Elvis, the author of previous challenge gave me another challenge. He already gave me a major hint about the challenge which you usually don’t get in real world scenarios. This challenge is another VM challenge and is an `OISC` (**One Instruction Set Computer**)

<!-- more -->

Running the executable shows a password prompt :

![password prompt](/images/evmbcm-passwd-prompt.png)

I type anything into it and it keeps watining until unless I exceed certain number of characters, after which it just exits. I don’t know this “certain number” yet but we can find this out by analyzing this in IDA.

Running this in IDA debugger successfully shows this prompt again but pausing the process is something else. We either run this process or stop it, no pausing and resuming execution. This might mean there is anti-debug or something more interesting to discover 🤩

Let’s analyze the `start` function of this program

![analysis of start function](/images/evmbcm-analysis-start.png)

aha… ok.. ok.. analysis of start complete 😆

This is spooky. I’ll rename these to `mainfn1` and `mainfn2` to be able to identify them when I encounter these again, but then again I can also check their XREFs and see when they are called or referenced, but this won’t be able to detect indirect references.

```c
uintptr_t mainfn1() {
    uintptr_t result; // eax
    unsigned int v1; // ecx
    LARGE_INTEGER PerformanceCount; // [esp+0h] [ebp-14h] BYREF
    struct _FILETIME SystemTimeAsFileTime; // [esp+8h] [ebp-Ch] BYREF
    DWORD v4; // [esp+10h] [ebp-4h] BYREF

    if (__security_cookie == -1153374642 || (__security_cookie & 0xFFFF0000) == 0) {
        SystemTimeAsFileTime.dwLowDateTime = 0;
        SystemTimeAsFileTime.dwHighDateTime = 0;
        GetSystemTimeAsFileTime( & SystemTimeAsFileTime);
        v4 = SystemTimeAsFileTime.dwLowDateTime ^ SystemTimeAsFileTime.dwHighDateTime;
        v4 ^= GetCurrentThreadId();
        v4 ^= GetCurrentProcessId();
        v4 ^= GetTickCount64();
        QueryPerformanceCounter( & PerformanceCount);
        result = (uintptr_t) & v4;
        v1 = (unsigned int) & v4 ^ v4 ^ PerformanceCount.LowPart ^ PerformanceCount.HighPart;
        if (v1 == 0xBB40E64E) {
            __security_cookie = 0xBB40E64F;
            dword_B44008 = 0x44BF19B0;
        } else {
            if ((v1 & 0xFFFF0000) == 0) {
                result = (v1 | 0x4711) << 16;
                v1 |= result;
            }
            __security_cookie = v1;
            dword_B44008 = ~v1;
        }
    } else {
        result = ~__security_cookie;
        dword_B44008 = ~__security_cookie;
    }
    return result;
}
```

![GetSystemTimeAsFileTime](/images/windoc-get-system-time-as-file-time.png)
![GetCurrentThreadId](/images/windoc-get-current-thread-id.png)
![GetCurrentProcessId](/images/windoc-get-current-process-id.png)
![GetTickCount64](/images/windoc-get-tick-count64.png)
![QueryPerformanceCounter](/images/windoc-query-performance-counter.png)
![What do my instincts say?](/images/evmbcm-human-instincts.png)

Notice the `__security_cookie` and `v1` have same types of checks. I wonder if this is a replacement technique for the `OpenMutexA(<mutex_name>)` in previous challenge. Let’s check.

Yepp! Take a look at this code again try to compare the intentions with previous challenge (i.e if you have read my previous post, else just keep following)

```c
uintptr_t mainfn1() {
    uintptr_t result; // eax
    unsigned int specialValue_1; // ecx
    LARGE_INTEGER PerformanceCount; // [esp+0h] [ebp-14h] BYREF
    struct _FILETIME SystemTimeAsFileTime; // [esp+8h] [ebp-Ch] BYREF
    DWORD specialValue; // [esp+10h] [ebp-4h] BYREF

    if (__security_cookie == 0xBB40E64E || (__security_cookie & 0xFFFF0000) == 0) {
        SystemTimeAsFileTime.dwLowDateTime = 0;
        SystemTimeAsFileTime.dwHighDateTime = 0;
        GetSystemTimeAsFileTime( & SystemTimeAsFileTime);
        specialValue = SystemTimeAsFileTime.dwLowDateTime ^ SystemTimeAsFileTime.dwHighDateTime;
        specialValue ^= GetCurrentThreadId();
        specialValue ^= GetCurrentProcessId();
        specialValue ^= GetTickCount64();
        QueryPerformanceCounter( & PerformanceCount);
        result = (uintptr_t) & specialValue;
        specialValue_1 = (unsigned int) & specialValue ^ specialValue ^ PerformanceCount.LowPart ^ PerformanceCount.HighPart;
        if (specialValue_1 == 0xBB40E64E) {
            __security_cookie = 0xBB40E64F;
            negatedSpecialValue = 0x44BF19B0;
        } else {
            if ((specialValue_1 & 0xFFFF0000) == 0) {
                result = (specialValue_1 | 0x4711) << 16;
                specialValue_1 |= result;
            }
            __security_cookie = specialValue_1;
            negatedSpecialValue = ~specialValue_1;
        }
    } else {
        result = ~__security_cookie;
        negatedSpecialValue = ~__security_cookie;
    }
    return result;
}
```

First this checks certain conditions on `__security_cookie` and if any one of those satisfy then it’ll generate a `specialValue` and modify the `__security_cookie` and generate a new `negatedSpecialValue` from the `specialValue`.

Intial value of `__security_cookie`

![__security_cookie initial value](/images/evmbcm-security-cookie.png)

This is exactly same with the check value in first `if` case.

But since this is the `__security_cookie` (stack canary), we should probably check this dynamically.

![__security_cookie final value](/images/evmbcm-security-cookie-final.png)

We can place a breakpoint just at the first `if` statement and check the value in `__security_cookie` and no matter how many times you run, this value will keep changing again and again! This is what stack canary actually is! It is there to detect `Stack Buffer Overflow` attacks and it is set to some random value always. 

This makes the execution follow the `else` branch

![else branch](/images/evmbcm-else-branch.png)

I’ll now change the name of this `mainfn1` to something more meaningful like

![mainfn1 rename](/images/evmbcm-rename-mainfn1.png)

Now we analyze `mainfn2`

```c
// positive sp value has been detected, the output may be wrong!
int __usercall mainfn2 @ < eax > (int a1 @ < esi > ) {
    char v1; // bl
    _DWORD * v3; // eax
    void(__cdecl ** v4)(_DWORD, int, _DWORD); // esi
    char v5; // [esp+10h] [ebp-24h]

    if (!sub_B41640(1)) {
        sub_B41880(7);
        goto LABEL_16;
    }
    v1 = 0;
    v5 = sub_B41600();
    if (dword_B47270 == 1) {
        LABEL_16: sub_B41880(7);
        goto LABEL_17;
    }
    if (dword_B47270) {
        v1 = 1;
    } else {
        dword_B47270 = 1;
        if (initterm_e((_PIFV * ) & First, (_PIFV * ) & Last))
            return 255;
        initterm((_PVFV * ) & dword_B430C0, (_PVFV * ) & dword_B430C8);
        dword_B47270 = 2;
    }
    sub_B41810(v5);
    v3 = (_DWORD * ) sub_B41870();
    v4 = (void(__cdecl ** )(_DWORD, int, _DWORD)) v3;
    if ( * v3 && (unsigned __int8) sub_B41730(v3))
        ( * v4)(0, 2, 0);
    a1 = ((int(__cdecl * )(int, char ** , char ** )) sub_B410AD)(_argc, _argv, environ);
    if (!(unsigned __int8) sub_B41A20())
        LABEL_17:
        exit(a1);
    if (!v1)
        cexit();
    sub_B41830(1, 0);
    return a1;
}
```

Lot’s of function calls! 9 unique fn calls in total!

Decompilation for `fn1` is 

```c
char __cdecl fn1(int a1) {
    if (!a1)
        fn1_called_with_false = 1;
    fn10();
    if (!(unsigned __int8) fn12())
        return 0;
    if (!(unsigned __int8) fn13()) {
        fn12();
        return 0;
    }
    return 1;
}
```

Let’s check this one by one.

`fn10` :

```c
int fn10() {
    int v5; // edi
    int v11; // eax
    int v12; // edi
    int v18; // eax
    int v19; // eax
    int v20; // eax
    int v22; // [esp+0h] [ebp-24h]
    char v23; // [esp+10h] [ebp-14h]
    int v24; // [esp+18h] [ebp-Ch]
    int v25; // [esp+1Ch] [ebp-8h]
    int v26; // [esp+20h] [ebp-4h]
    int v27; // [esp+20h] [ebp-4h]

    dword_B47330 = 0;
    dword_B44010 |= 1 u;
    if (IsProcessorFeaturePresent(PF_XMMI64_INSTRUCTIONS_AVAILABLE)) {
        _EAX = 0;
        __asm {
            cpuid
        }
        v24 = _EAX;
        v5 = _ECX ^ 0x6C65746E;
        v25 = _EDX ^ 0x49656E69;
        v26 = _EBX ^ 0x756E6547;
        _EAX = 1;
        __asm {
            cpuid
        }
        v22 = _EAX;
        if (!(v25 | v5 | v26) &&
            ((v11 = _EAX & 0xFFF3FF0, (v22 & 0xFFF3FF0) == 67264) ||
                v11 == 132704 ||
                v11 == 132720 ||
                v11 == 198224 ||
                v11 == 198240 ||
                v11 == 198256)) {
            v12 = dword_B47334 | 1;
            dword_B47334 |= 1 u;
        } else {
            v12 = dword_B47334;
        }
        _EAX = 7;
        v27 = _ECX;
        if (v24 < 7) {
            _EBX = 0;
        } else {
            __asm {
                cpuid
            }
            _ECX = v27;
            if ((_EBX & 0x200) != 0)
                dword_B47334 = v12 | 2;
        }
        v18 = dword_B44010 | 2;
        dword_B47330 = 1;
        dword_B44010 |= 2 u;
        if ((_ECX & 0x100000) != 0) {
            v19 = v18 | 4;
            dword_B47330 = 2;
            dword_B44010 = v19;
            if ((_ECX & 0x8000000) != 0 && (_ECX & 0x10000000) != 0) {
                __asm {
                    xgetbv
                }
                v23 = v19;
                if ((v19 & 6) == 6) {
                    v20 = dword_B44010 | 8;
                    dword_B47330 = 3;
                    dword_B44010 |= 8 u;
                    if ((_EBX & 0x20) != 0) {
                        dword_B47330 = 5;
                        dword_B44010 = v20 | 0x20;
                        if ((_EBX & 0xD0030000) == -805109760 && (v23 & 0xE0) == 224) {
                            dword_B44010 |= 0x40 u;
                            dword_B47330 = 6;
                        }
                    }
                }
            }
        }
    }
    return 0;
}
```

Hmm… This looks like some type of Anti-VM, but the program was running normally (or maybe not). If you have Virtualization turned on using `KVM` (say), then `cpuid` will return `KVMKVMKVM` in `ebx`, `ecx` and `edx`. What it might also be doing is using these values to do some comparision or something. So that it seems like the program is running just fine but even if you enter the correct password it’ll consider that as wrong. I encountered this program in one of the `ReverseMe3` or `ReverseMe4` crackmes from crackes[.]one. This is relatively easy to defeat (given that’s what is going on here).

![CPUID output for vendor string](/images/evmbcm-cpuid-exec.png)
![IsProcessorFeaturePresent](/images/windoc-is-process-feature-present.png)

So it’s checking whether `XMM` instructions are supported or not. Meaning can we use `XMM` registers in our normal `mov`, `cmp` etc instructions.

![CPUID Information](/images/evmbcm-felixcloutier-cpuid-args.png)

Images are take from **[Felix Cloutier’s Website](https://www.felixcloutier.com/)**

You can see here tha when `eax` is 0 and `cpuid` is executed, we’ll get the so called **Vendor Information String**.

When `eax` is 1, `cpuid` will return many things…

![EAX=0x1 leaf](/images/evmbcm-cpuid-eax01h-leaf.png)

The upper nibble is reserved so we don’t check that. If we try to understand each field on our own then it’ll be quite difficult, so let’s take help of the binary that we are analyzing. It’s doing some operations on the value returned in `eax`, `ebx`, `ecx` and `edx` registers from the `eax = 0x1` leaf in `cpuid`.

The meaning of  `ExtendedFamilyID` and `ExtenedModelID` can be understood from the code given below (sometimes reading code is much faster than reading text 😇 :

```c
// ExtendedFamilyID is used only when FamilyID is 0xF (only one nibble)
if (FamilyID != 0xF) {
		DisplayFamilyID = FamilyID;
} else {
    DisplayFamilyID = (ExtendedFamilyID << 4) | FamilyID;
}

// ExtendedModelID is used only when FamilyID is 0x6 or 0xF
if (FamilyID == 0x6 || FamilyID == 0xF) {
		DisplayModelID = (ExtendedModelID << 4) | ModelID;
} else { 
    DisplayModelID = ModelID;
}
```

Now back to the code :

![Comparing returned CPUID values](/images/evmbcm-cpuid-compare.png)

We see here that the program is taking bitwise and of `_EAX` register value and `0x0FFF3FF0`. You see the upper nibble here is left out (because it’s reserved). Next it’s also leaving out the `SteppingID`. What’s being compared are the `ModelID` which is checked against 0xC, 0x5, 0x6 or 0x7, `FamilyID` is always 6 (meaning use of `ExtendedModelID`), `ProcessorType` is being neglected and finally `ExtendedModelID` is compared against 0x1, 0x2 or 0x3. Note that `ExtendedFamilyID` is also left out.

All in all, we can just rename that `dword_B47334` to `supportedProcessor` for now.

![supportedProcessor](/images/evmbcm-supported-processor-var.png)
![rename](/images/evmbcm-var-rename.png)

`x0` is the value of `eax` returned when `cpuid` was called with `eax=0`. This is the highest value you can set to `eax` and execute `cpuid` to get some cpu information. For `eax=0x7`, we have information about the highest value of `ebx` to get subleaf information from `cpuid`.

![EAX=0x7 leaf](/images/evmbcm-cpuid-eax07h-leaf.png)

If we keep on analyzing like this then it might take a long time… So we’ll just name all these `dword_xxxxx` values to something that we can indentify in future. For now I’ll name these as `procInfo[0-9+]` after which the code looks like this :

```c
int getProcessorInformation() {
    int x1; // edi
    int v11; // eax
    int supported; // edi
    int v18; // eax
    int v19; // eax
    int v20; // eax
    int x_eax; // [esp+0h] [ebp-24h]
    char v23; // [esp+10h] [ebp-14h]
    int x0; // [esp+18h] [ebp-Ch]
    int x2; // [esp+1Ch] [ebp-8h]
    int x3; // [esp+20h] [ebp-4h]
    int __ECX; // [esp+20h] [ebp-4h]

    procInfo2 = 0;
    procInfo1 |= 1 u;
    if (IsProcessorFeaturePresent(PF_XMMI64_INSTRUCTIONS_AVAILABLE)) {
        _EAX = 0;
        __asm {
            cpuid
        }
        x0 = _EAX;
        x1 = _ECX ^ 'letn';
        x2 = _EDX ^ 'Ieni';
        x3 = _EBX ^ 'uneG';
        _EAX = 1;
        __asm {
            cpuid
        }
        x_eax = _EAX;
        if (!(x2 | x1 | x3) &&
            ((v11 = _EAX & 0xFFF3FF0, (x_eax & 0xFFF3FF0) == 0x106C0) ||
                v11 == 0x20660 ||
                v11 == 0x20670 ||
                v11 == 0x30650 ||
                v11 == 0x30660 ||
                v11 == 0x30670)) {
            supported = supportedProcessor | 1;
            supportedProcessor |= 1 u;
        } else {
            supported = supportedProcessor;
        }
        _EAX = 7;
        __ECX = _ECX;
        if (x0 < 7) {
            _EBX = 0;
        } else {
            __asm {
                cpuid
            }
            _ECX = __ECX;
            if ((_EBX & 0x200) != 0)
                supportedProcessor = supported | 2;
        }
        v18 = procInfo1 | 2;
        procInfo2 = 1;
        procInfo1 |= 2 u;
        if ((_ECX & 0x100000) != 0) {
            v19 = v18 | 4;
            procInfo2 = 2;
            procInfo1 = v19;
            if ((_ECX & 0x8000000) != 0 && (_ECX & 0x10000000) != 0) {
                __asm {
                    xgetbv
                }
                v23 = v19;
                if ((v19 & 6) == 6) {
                    v20 = procInfo1 | 8;
                    procInfo2 = 3;
                    procInfo1 |= 8 u;
                    if ((_EBX & 0x20) != 0) {
                        procInfo2 = 5;
                        procInfo1 = v20 | 0x20;
                        if ((_EBX & 0xD0030000) == 0xD0030000 && (v23 & 0xE0) == 0xE0) {
                            procInfo1 |= 0x40 u;
                            procInfo2 = 6;
                        }
                    }
                }
            }
        }
    }
    return 0;
}
```

Next we analyze `fn13`

![fn13](/images/evmbcm-fn13.png)

The `off_B340FC` variable stores offset to some other function : 

![off_B340FC](/images/evmbcm-var1.png)

I renamed the function to something more meaningful.

```c
char loadSomeFunctionAddresses()
{
  HMODULE ModuleHandleW; // eax
  FARPROC RtlWow64EnableFsRedirectionEx; // edi
  HMODULE v2; // eax
  char result; // al

  ModuleHandleW = GetModuleHandleW(L"kernel32");
  if ( ModuleHandleW )
    is_fnAddDllDirectory_present = GetProcAddress(ModuleHandleW, "AddDllDirectory") != 0;
  RtlWow64EnableFsRedirectionEx = 0;
  v2 = GetModuleHandleW(L"ntdll");
  if ( v2 )
    RtlWow64EnableFsRedirectionEx = GetProcAddress(v2, "RtlWow64EnableFsRedirectionEx");
  sec_cookie4 = __security_cookie;
  sec_cookie3 = __security_cookie;
  sec_cookie2 = __security_cookie;
  result = 1;
  sec_cookie1 = __security_cookie;
  RtlWow64EnableFsRedirectionEx_xorred_with__security_cookie = __security_cookie ^ __ROR4__(
                                                                                     RtlWow64EnableFsRedirectionEx,
                                                                                     32 - (__security_cookie & 0x1F));
  return result;
}
```

Second argument to `fn13` is just 0 initially.

After analyzing this function `fn13` more for a while I realize that it might be dealing with some type of function table :

![loadFunctionTables](/images/evmbcm-loadFnTable.png)
![fn table start](/images/evmbcm-fntablestart.png)

because the `executeFunctionsInFnTable` function looks like this : 

```c
char __cdecl executeFunctionsInFnTable(unsigned __int8( ** fnTableStart)(void), unsigned __int8( ** fnTableEnd)(void)) {
    unsigned __int8( ** pfnIter)(void); // esi
    unsigned __int8( ** iter)(void); // esi
    int v5; // [esp+0h] [ebp-Ch]

    if (fnTableStart == fnTableEnd)
        return 1;
    pfnIter = fnTableStart;
    while (! * pfnIter || ((unsigned __int8(__cdecl * )(int)) * pfnIter)(v5)) // while value at pfnIter DWORD is 0 or the value returned after calling pfnIter is true.
    // Note that if (!*pfnIter) is true then pfnIter won't be called so there is no issue with calling nullptr
    {
        pfnIter += 2; // skipping two functions at a time
        if (pfnIter == fnTableEnd) // when reach end of table then return 1
            return 1;
    }
    if (pfnIter != fnTableStart) {
        iter = pfnIter - 1;
        do {
            if ( * (iter - 1)) // if value at (iter-1) is not 0, i.e DWORD just before iter
            {
                if ( * iter) // if iter itself does not point to a zero value
                    ((void(__cdecl * )(_DWORD)) * iter)(0); // call iter
            }
            iter -= 2;
        }
        while (iter + 1 != fnTableStart);
    }
    return 0;
}
```

I’d now like to analyze this function table.

The first function `sub_B41D30` looks like this : 

```c
char __cdecl freeLibrariesInModuleHandleTable(char a1)
{
  HMODULE *moduleIter; // esi

  if ( !a1 )
  {
    moduleIter = &moduleHandleTable;
    do
    {
      if ( *moduleIter )
      {
        if ( *moduleIter != (HMODULE)-1 )
          FreeLibrary(*moduleIter);
        *moduleIter = 0;
      }
      ++moduleIter;
    }
    while ( moduleIter != (HMODULE *)&sec_cookie4 );
  }
  return 1;
}
```

change the type of `moduleHandleTable` to `HANDLE*` or a `HANDLE` array.

![module handles table](/images/evmbcm-module-handle-table.png)

The next function in function table just calls `return1` with argument 0 and then returns.

![sub_b41c00](/images/evmbcm-b41c00.png)

Third function frees two pointers. 

![sub_b41c10](/images/evmbcm-b41c10.png)

I’ll rename `Block` and `dword_B4731C` to `GlobalPtr1` and `GlobalPtr2` because it makes more sense here. It might be possible  that something is allocated and pointer is stored in these `GlobalPtrX` variables and this function just calls `free` on those two.

![free global ptrs](/images/evmbcm-free-global-ptrs.png)

Second last function is :

![sub_b41be0](/images/evmbcm-b41be0.png)
![sub_b41bb0](/images/evmbcm-b41bb0.png)

The function table now looks like this :

![updated fn table](/images/evmbcm-updated-fn-table.png)

and `fn1` now looks like this :

![updated fn1](/images/evmbcm-get-proc-info-and-load-fn-table.png)

After sifting through other functions I found this `fn7` function quite interesting…

```c
int fn7()
{
  _WORD *v0; // eax
  _WORD *v1; // esi

  v0 = VirtualAlloc(0, 0x20000u, 0x1000u, 4u);
  v1 = v0;
  lpAddress = v0;
  if ( v0 )
  {
    memcpy(v0 + 300, &unk_B44018, 0x3246u);
    *v1 = 300;
    if ( !(unsigned __int8)sub_B41000() )
      printf("Failed to run program\n");
    if ( lpAddress )
    {
      VirtualFree(lpAddress, 0, 0x8000u);
      lpAddress = 0;
    }
  }
  else
  {
    printf("Failed to init program\n");
  }
  return 0;
}
```

It looks like this is the actual program we should be reversing… Why? well because of two things : 

- Before I modified the `fn7` function signature, there were `argc`, `argv` and `environ` variables present as argument, which is generally the signature of `main` in C/C++ programs.
- While having general talk with Elvis and giving him this writeup link to read as I progress through the challenge, he pointed out that the code I’m reversing at the moment is compiler generated code and not the actual program code that he wrote and if we take a look at the big picture, it actually makes sense! Checking for XMM register support? Loading function tables? Freeing module handles at the very beginning? All this looks like some boilerplate code. If not the first and last, atleast loading function table looks like the boilerplate code!

But I want to reverse this chall completely on my own so I’ll assume that I know nothing and resume with analyzing other functions too. Who knows? it might pay well in other challenges because I’ll be able to recognize this code! Also, he said that this challenge can be solved in much simpler way because he thought the challenge will be too hard and thus he added a shortcut to solve it. But I haven’t even started reversing the actual chall yet so how would I know 🤣 I’m super N00B!

Time to analyze `fn2`

```c
LONG __usercall fn2 @ < eax > (int a1 @ < ebx > , int a2 @ < edi > , int a3 @ < esi > , unsigned int a4) {
    void * v4; // eax
    int v5; // ecx
    int v6; // edx
    unsigned int v7; // kr00_4
    BOOL v8; // eax
    bool v9; // bl
    LONG result; // eax
    int v11[179]; // [esp+4h] [ebp-324h] BYREF
    int v12[20]; // [esp+2D0h] [ebp-58h] BYREF
    struct _EXCEPTION_POINTERS ExceptionInfo; // [esp+320h] [ebp-8h] BYREF
    int savedregs; // [esp+328h] [ebp+0h]
    int retaddr; // [esp+32Ch] [ebp+4h] BYREF

    if (IsProcessorFeaturePresent(0x17 u))
        __fastfail(a4);
    sub_B41AE0(3);
    v4 = memset(v11, 0, sizeof(v11));
    v11[44] = (int) v4;
    v11[43] = v5;
    v11[42] = v6;
    v11[41] = a1;
    v11[40] = a3;
    v11[39] = a2;
    LOWORD(v11[50]) = __SS__;
    LOWORD(v11[47]) = __CS__;
    LOWORD(v11[38]) = __DS__;
    LOWORD(v11[37]) = __ES__;
    LOWORD(v11[36]) = __FS__;
    LOWORD(v11[35]) = __GS__;
    v7 = __readeflags();
    v11[48] = v7;
    v11[46] = retaddr;
    v11[49] = (int) & retaddr;
    v11[0] = 65537;
    v11[45] = savedregs;
    v12[2] = 0;
    memset( & v12[4], 0, 64);
    v12[0] = 1073741845;
    v12[1] = 1;
    v12[3] = retaddr;
    v8 = IsDebuggerPresent();
    ExceptionInfo.ExceptionRecord = (PEXCEPTION_RECORD) v12;
    v9 = v8;
    ExceptionInfo.ContextRecord = (PCONTEXT) v11;
    SetUnhandledExceptionFilter(0);
    result = UnhandledExceptionFilter( & ExceptionInfo);
    if (!result && !v9)
        return sub_B41AE0(3);
    return result;
}
```

This looks hard to read for now… but after analyzing this, things make more sense :

![guessing var type](/images/evmbcm-guessing-vartype.png)

```c
void __usercall fn2(DWORD _EBX @ < ebx > , DWORD _EDI @ < edi > , DWORD _ESI @ < esi > , unsigned int fastfail_errcode) {
    void * _EAX; // eax
    DWORD _ECX; // ecx
    DWORD _EDX; // edx
    DWORD v7; // kr00_4
    BOOL isDebuggerPresent; // eax
    bool _isDebuggerPresent; // bl
    CONTEXT context; // [esp+4h] [ebp-324h] BYREF
    EXCEPTION_RECORD exceptionRecord; // [esp+2D0h] [ebp-58h] BYREF
    struct _EXCEPTION_POINTERS ExceptionInfo; // [esp+320h] [ebp-8h] BYREF
    DWORD savedregs; // [esp+328h] [ebp+0h]
    void * retaddr; // [esp+32Ch] [ebp+4h] BYREF

    if (IsProcessorFeaturePresent(PF_FASTFAIL_AVAILABLE))
        __fastfail(fastfail_errcode);
    setDebuggerNotPresent();
    _EAX = memset( & context, 0, sizeof(context));
    context.Eax = (DWORD) _EAX;
    context.Ecx = _ECX;
    context.Edx = _EDX;
    context.Ebx = _EBX;
    context.Esi = _ESI;
    context.Edi = _EDI;
    LOWORD(context.SegSs) = __SS__;
    LOWORD(context.SegCs) = __CS__;
    LOWORD(context.SegDs) = __DS__;
    LOWORD(context.SegEs) = __ES__;
    LOWORD(context.SegFs) = __FS__;
    LOWORD(context.SegGs) = __GS__;
    v7 = __readeflags();
    context.EFlags = v7;
    context.Eip = (DWORD) retaddr;
    context.Esp = (DWORD) & retaddr;
    context.ContextFlags = 0x10001; // CONTEXT_CONTROL
    context.Ebp = savedregs;
    exceptionRecord.ExceptionRecord = 0;
    memset( & exceptionRecord.NumberParameters, 0, 64);
    exceptionRecord.ExceptionCode = 0x40000015;
    exceptionRecord.ExceptionFlags = 1;
    exceptionRecord.ExceptionAddress = retaddr;
    isDebuggerPresent = IsDebuggerPresent();
    ExceptionInfo.ExceptionRecord = & exceptionRecord;
    _isDebuggerPresent = isDebuggerPresent;
    ExceptionInfo.ContextRecord = & context;
    SetUnhandledExceptionFilter(0);
    if (!UnhandledExceptionFilter( & ExceptionInfo) && !_isDebuggerPresent) // if EXCEPTION_CONTINUE_SEARCH is returned and a debugger is not present
        setDebuggerNotPresent();
}
```

![UnhandledExceptionFilter](/images/windoc-unhandled-exception-filter.png)
![UnhandledExceptionFilter ReturnValue](/images/windoc-unhandled-exception-filter-retval.png)

The value of `ContextFlags` can be retrieved from **ReactOS** souce code :

![ContextFlags](/images/reactos-context-flags.png)

and value of enums in `EXCEPTION_RECORD` struct can also be found from the same, for eg: `ExceptionFlags` :

![ExceptionFlags](/images/reactos-exception-flags.png)

But analyzing things like this doesn’t seem much productive so let’s move on further and we will come back if we feel like we missed some part. (I just wanted to show off my editor 😜). I’ll rename this one to `pingDebuggerAboutProblem` btw.

Things start to make more sense now :

![mainfn1](/images/evmbcm-mainfn1.png)

Now we move on to `fn3`

```c
char fn3() {
    PVOID StackBase; // edx
    signed __int32 ret; // eax

    if (!checkStackBaseCopied())
        return 0;
    StackBase = NtCurrentTeb() -> NtTib.StackBase;
    ret = _InterlockedCompareExchange( & stackBase, (signed __int32) StackBase, 0);
    if (!ret)
        return 0;
    while (StackBase != (PVOID) ret) // make sure the exchange occured
    {
        ret = _InterlockedCompareExchange( & stackBase, (signed __int32) StackBase, 0);
        if (!ret)
            return 0;
    }
    return 1;
}
```

This code is quite simple and clear. I’ll rename `fn3` to `makeStackBaseAddressCopy`.

Moving on, let’s not focus on `unkm1` for now and foucs on `fn4` and this `initterm`

![analyze unkm1](/images/evmbcm-analyze-unkm1.png)
![initterm](/images/windoc-initterm.png)

 We’ll have to check these function tables now.

![fn table](/images/evmbcm-fntable-1.png)

The very first function seem to be setting unexpected exception filter to `TopLevelExceptionFilter`.

```c
LONG __stdcall TopLevelExceptionFilter(struct _EXCEPTION_POINTERS * ExceptionInfo) {
    PEXCEPTION_RECORD ExceptionRecord; // esi
    ULONG_PTR v2; // eax
    PCONTEXT ContextRecord; // esi

    ExceptionRecord = ExceptionInfo -> ExceptionRecord;
    if (ExceptionInfo -> ExceptionRecord -> ExceptionCode == 0xE06D7363 && ExceptionRecord -> NumberParameters == 3) {
        v2 = ExceptionRecord -> ExceptionInformation[0];
        if (v2 == 0x19930520 || v2 == 0x19930521 || v2 == 0x19930522 || v2 == 0x1994000) {
            *(_DWORD * ) sub_B41B00() = ExceptionRecord;
            ContextRecord = ExceptionInfo -> ContextRecord;
            *(_DWORD * ) sub_B41B10() = ContextRecord;
            terminate();
        }
    }
    return 0;
}
```

Again I guess we don’t need to analyze this as we know that this can’t be the actual code. In static analysis I guess we don’t care much about exception handlers and all (given they look clean).

```c
// 2nd function in table
int sub_B411E0() {
    doSomeOrOperationsOnUnkm3AndUnkm4();
    return 0;
}

char * doSomeOrOperationsOnUnkm1AndUnkm2() {
    _DWORD * Unkm3Addr; // eax
    int v1; // ecx
    char * result; // eax
    int v3; // ecx

    Unkm3Addr = getUnkm3Addr();
    v1 = Unkm3Addr[1];
    * Unkm3Addr |= 0x24 u;
    Unkm3Addr[1] = v1;
    result = getUnkm4Addr();
    v3 = * ((_DWORD * ) result + 1);
    *(_DWORD * ) result |= 2 u;
    *((_DWORD * ) result + 1) = v3;
    return result;
}
```

I’m getting decompilation failue for first function in function table

![decompilation failure](/images/evmbcm-decomp-failure.png)

but the disassembly is small so we can just read and understand but again as I seem to reversing these functions more and more (after taking a look at `fn7`, I feel I should skip these functions for now. I guess this might also be because Elvis pointed out that I’m reversing compiler bootstrap code)

```x86asm
.text:00B41140                               firstFnInFnTable proc near              ; DATA XREF: .rdata:00B430D0↓o
.text:00B41140 56                            push    esi
.text:00B41141 6A 01                         push    1                               ; Type
.text:00B41143 E8 D8 09 00 00                call    sub_B41B20
.text:00B41143
.text:00B41148 E8 03 04 00 00                call    sub_B41550
.text:00B41148
.text:00B4114D 50                            push    eax                             ; struct _exception *
.text:00B4114E E8 D0 0E 00 00                call    _set_fmode
.text:00B4114E
.text:00B41153 E8 38 03 00 00                call    UserMathErrorFunction
.text:00B41153
.text:00B41158 8B F0                         mov     esi, eax
.text:00B4115A 89 35 60 72 B4 00             mov     dword_B47260, esi
.text:00B41160 E8 D0 0E 00 00                call    __p__commode
.text:00B41160
.text:00B41165 6A 01                         push    1
.text:00B41167 89 30                         mov     [eax], esi
.text:00B41169 E8 12 05 00 00                call    sub_B41680
.text:00B41169
.text:00B4116E 83 C4 0C                      add     esp, 0Ch
.text:00B41171 5E                            pop     esi
.text:00B41172 84 C0                         test    al, al
.text:00B41174 74 56                         jz      short callPingDebuggerAboutProblem
.text:00B41174
.text:00B41176 DB E2                         fnclex
.text:00B41178 E8 23 03 00 00                call    sub_B414A0
.text:00B41178
.text:00B4117D 50                            push    eax
.text:00B4117E E8 2D 03 00 00                call    sub_B414B0
.text:00B4117E
.text:00B41183 83 C4 04                      add     esp, 4
.text:00B41186 85 C0                         test    eax, eax
.text:00B41188 75 42                         jnz     short callPingDebuggerAboutProblem
.text:00B41188
.text:00B4118A E8 D1 03 00 00                call    sub_B41560
.text:00B4118A
.text:00B4118F E8 CC 06 00 00                call    sub_B41860
.text:00B4118F
.text:00B41194 85 C0                         test    eax, eax
.text:00B41196 74 0D                         jz      short loc_B411A5
.text:00B41196
.text:00B41198 68 90 14 B4 00                push    offset UserMathErrorFunction    ; UserMathErrorFunction
.text:00B4119D E8 63 0E 00 00                call    __setusermatherr
.text:00B4119D
.text:00B411A2 83 C4 04                      add     esp, 4
.text:00B411A2
.text:00B411A5
.text:00B411A5                               loc_B411A5:                             ; CODE XREF: firstFnInFnTable+56↑j
.text:00B411A5 E8 F6 03 00 00                call    nullsub_1
.text:00B411A5
.text:00B411AA E8 F1 03 00 00                call    nullsub_1
.text:00B411AA
.text:00B411AF E8 BC 03 00 00                call    sub_B41570
.text:00B411AF
.text:00B411B4 E8 D7 02 00 00                call    UserMathErrorFunction
.text:00B411B4
.text:00B411B9 50                            push    eax
.text:00B411BA E8 81 09 00 00                call    sub_B41B40
.text:00B411BA
.text:00B411BF 83 C4 04                      add     esp, 4
.text:00B411C2 E8 49 08 00 00                call    j_UserMathErrorFunction
.text:00B411C2
.text:00B411C7 85 C0                         test    eax, eax
.text:00B411C9 75 01                         jnz     short callPingDebuggerAboutProblem
.text:00B411C9
.text:00B411CB C3                            retn
.text:00B411CB
.text:00B411CC                               ; ---------------------------------------------------------------------------
.text:00B411CC
.text:00B411CC                               callPingDebuggerAboutProblem:           ; CODE XREF: firstFnInFnTable+34↑j
.text:00B411CC                                                                       ; firstFnInFnTable+48↑j
.text:00B411CC                                                                       ; firstFnInFnTable+89↑j
.text:00B411CC 6A 07                         push    7
.text:00B411CE E8 AD 06 00 00                call    pingDebuggerAboutProblem
.text:00B411CE
.text:00B411CE                               firstFnInFnTable endp
.text:00B411CE
.text:00B411CE                               ; ---------------------------------------------------------------------------
.text:00B411D3 CC CC CC CC CC CC CC CC CC CC+align 10h
```

What I can do for now is change the name to something that I can remember for future purpose. I’ll change it’s name to `firstFnInFnTable`. The basic goal now is to skip any function that’s taking time to reverse as in real life scenarios we have to reverse programs as fast as possible. If we get basic insight on what a function might do then we just skip it by adding some recognizable name to it.

![skip time taking functions](/images/evmbcm-skip-time-taking-fns.png)

Next, `fn4` is checking for stack base address again

```x86asm
__int32 __cdecl fn4(char a1) {
    __int32 result; // eax

    result = checkStackBaseCopied();
    if (result) {
        if (!a1)
            return _InterlockedExchange( & stackBase, 0);
    }
    return result;
}
```

`fn5` is getting address of a memory region that I now named `unkm5`

```c
void *getUnkm5Addr() {
    return &unkm5;
}
```

This code now seems strange : 

![strange code](/images/evmbcm-strage-code.png)

`Unkm5` is a function?

Also, `fn6` is checking some PE file signatures…

```c
bool __cdecl fn6(int a1) {
    int v1; // eax
    bool result; // al

    result = 0;
    if (MEMORY[0xB40000] == 'ZM' &&
        * (_DWORD * )(MEMORY[0xB4003C] + 0xB40000) == 'EP' &&
        * (_WORD * )(MEMORY[0xB4003C] + 0xB40018) == 0x10B) {
        v1 = sub_B415B0(0xB40000, a1 - 11796480);
        if (v1) {
            if ( * (int * )(v1 + 36) >= 0)
                return 1;
        }
    }
    return result;
}
```

Skip this too for now…

Now finally we reach to `fn7`

![fn7 call](/images/evmbcm-fn7-call.png)

Notice that `argc`, `argv` and `environ` part I was telling about? Now I guess in future I won’t be fooled by compiler code and actual code. I hope so!

```c
int fn7() {
    _WORD * v0; // eax
    _WORD * v1; // esi

    v0 = VirtualAlloc(0, 0x20000 u, MEM_COMMIT, PAGE_READ_WRITE);
    v1 = v0;
    lpAddress = v0;
    if (v0) {
        memcpy(v0 + 300, & unk_B44018, 0x3246 u);
        * v1 = 300;
        if (!(unsigned __int8) sub_B41000())
            printf("Failed to run program\n");
        if (lpAddress) {
            VirtualFree(lpAddress, 0, 0x8000 u);
            lpAddress = 0;
        }
    } else {
        printf("Failed to init program\n");
    }
    return 0;
}
```

This `sub_B41000` looks like a VM. Why? Take a look at this memory that it’s copying to newly allocated area :

![bytecode memory view](/images/evmbvm-bytecode-memory-view.png)

The entropy of this region seems to be low. You can see lot’s of similar bytes. This means they can be VM bytecodes.

Well at first sight one might not guess it as a VM (especially when you don’t have information that it’s an `OISC`) but if you look at it’s code : 

```c
int sub_B41000() {
    unsigned __int16 * v0; // ebx
    int result; // eax
    int v2; // edx
    int v3; // ecx
    int v4; // esi
    int v5; // edi

    v0 = (unsigned __int16 * ) lpAddress;
    for (result = 1;* v0 != 0xFFFF; result = 1) {
        if (v0[4] == 1) {
            v0[4] = 0;
            printf("%c", v0[3]);
            v0 = (unsigned __int16 * ) lpAddress;
        }
        if (v0[6] == 1) {
            v0[6] = 0;
            scanf("%c", v0 + 5);
            v0 = (unsigned __int16 * ) lpAddress;
        }
        v2 = * v0;
        v3 = v0[v2 + 1];
        v4 = v0[v2];
        v5 = v0[v2 + 2];
        * v0 = v2 + 3;
        LOWORD(v3) = ~(v0[v4] | v0[v3]);
        v0[v5] = v3;
        v0[1] = __ROL2__(v3, 1);
    }
    return result;
}
```

Take a look at that `for` loop, it’s quite strange. Looks like it’ll keep running until this `v0` won’t reach a certain value! Now I admit, it would have been impossible to detect this without that huge hint but who knows, I might be wrong. One more thing about this is that when `v0[4]` is 1, it’ll call `printf` and `scanf` when `v0[6]` is 1. This looks like `syscalls` for input/output operations in the VM.

I also suspect that this `v0` might be the `pc` of this VM.

# Moment of Truth

To be honest, I never came across reversing an `OISC` VM. So, it’s time to study about these types of VM.

So, after going through some resources, I have some basic knowledge of how OISC computers work. This one is a `nor` computer. It’ll take two values, nor them and store it to some other place (can be confirmed from code above). There are two syscalls (kindof) available to read and write values character by character. I wrote a python script to simulate this VM : 

```python
#!/usr/bin/env python3

# rotate n by d bits
def rol(n, d):
    return (n << d) | (n >> (16 - d))

# read all binary file data to bindata
f = open("MagicBox_Challenge.exe", 'rb')
binData = f.read()
f.close()

vmCodeOffset = 0x2618
vmCodeSize = 0x3246

vmCode = []
for i in range(300):
    vmCode.append(0)
vmCode[0] = 300

for i in range(int(vmCodeSize/2)):
    vmCode.append(int.from_bytes(binData[vmCodeOffset+2*i:vmCodeOffset+2*i+2], 'little'))

for i in range(0x2000):
    vmCode.append(0)

while vmCode[0] != 0xffff:
    print(f'{hex(vmCode[0])}({vmCode[0]}) -\t\t {hex(vmCode[vmCode[0]])} {hex(vmCode[vmCode[0]+1])} {hex(vmCode[vmCode[0]+2])} -\t\t', end = '')

    if vmCode[4] == 1:
        vmCode[4] = 0
        print(chr(vmCode[3]))

    if vmCode[6] == 1:
        vmCode[6] = 0
        vmCode[5] = ord(input('Enter Character : ')[0])

    v = vmCode[0]
    arg0 = vmCode[v]
    arg1 = vmCode[v+1]
    arg2 = vmCode[v+2]

    vmCode[0] = v+3

    vmCode[arg2] = ~(vmCode[arg0] | vmCode[arg1])
    print(f'nor {hex(arg2)}, {hex(vmCode[arg0])}, {hex(vmCode[arg1])} || \t\t [{hex(arg2)}] = {hex(vmCode[arg2])}, [{hex(arg0)}], [{hex(arg1)}]')

    vmCode[1] = rol(vmCode[arg2], 1)
    # print(f'mov [0x1], rol({hex(vmCode[arg2])}, 1) = {hex(vmCode[0+1])}\n')
```

![generated assembly](/images/evmbcm-generated-assembly.png)

Phew! too many lines of code, but there’s a patter to it! You can check it at [this pastebin](https://pastebin.com/z3WteRin).

![password print](/images/evmbcm-passwd-print.png)

Also, after the input of 26 characters (at once) it performs some checks and prints Wrong if the input is wrong.

![vm arch diagram](/images/evmbcm-vm-arch.png)

Considering these changes and some limitations of python for doing bitwise operations, I wrote the disassembler in C++ (a language that I prefer over any other).

```cpp
#include <iostream>
#include <fstream>
#include <cstdint>
#include <vector>
#include <string>
#include <cassert>

#define FILENAME "MagicBox_Challenge.exe"
#define VM_CODE_FILE_OFFSET 0x2618
#define VM_CODE_FILE_SIZE   0x3246
#define VM_CODE_VM_OFFSET   300

using namespace std;

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

typedef int8_t  i8;
typedef int16_t i16;
typedef int32_t i32;
typedef int64_t i64;

// all instructions are NOR so we just need to specify operands
struct Instruction {
    enum class Type {
        NOR,
        READ,
        WRITE
    };

    Type type;

    u16 src1; u16 src1_val;
    u16 src2; u16 src2_val;
    u16 dst;  u16 dst_val;
};

struct VmContext {
    vector<u16> code;

    // all parsed instructions
    vector<Instruction> instructions;
    void ParseInstructions();
    void Disassemble();
    void Solve();
};

template<typename DType>
DType rol(DType x, u8 n) {
    assert(n <= sizeof(DType)*8 && "ROTATION POSITION CANNOT BE MORE THAN NUMBER OF BITS IN DATA TYPE");
    return (x << n) | (x >> (sizeof(DType)*8 - n));
}

void VmContext::ParseInstructions() {
    assert((code.size() != 0) && "NO INSTRUCTIONS TO PARSE!");

    Instruction ins;

    string flag(26, 'a');
    u8 fl_idx = 0; // flag index;

    u16 vip = code[0];
    while(vip != 0xffff) {
        vip = code[0];
        ins.type = Instruction::Type::NOR;

        if(code[4] == 1){
            code[4] = 0;
            ins.type = Instruction::Type::WRITE;
            putchar(code[3]);
        }

        if(code[6] == 1){
            code[6] = 0;
            ins.type = Instruction::Type::READ;
            code[5] = flag[fl_idx++]; // set dummy data
        }

        ins.src1 = code[vip];
        ins.src1_val = code[ins.src1];

        ins.src2 = code[vip + 1];
        ins.src2_val = code[ins.src2];

        ins.dst = code[vip + 2];

        // this needs to be placed before the assignment
        // because there are instructions that manipulate instruction ptr
        code[0] = vip + 3;

        code[ins.dst] = ~(code[ins.src1] | code[ins.src2]);
        ins.dst_val = code[ins.dst];

        code[1] = rol(code[ins.dst], 1);

        // add this instruction to list of parsed instructions
        instructions.push_back(ins);
    }
}

void VmContext::Solve() {
    assert((code.size() != 0) && "NO INSTRUCTIONS TO PARSE!");

    // create copy of code backup
    vector<u16> code_bak = code;

    Instruction ins;

    string printable = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()~`,./\\\"';:[]{}-_=+|";
    u8 prnt_idx = 0;
    string flag(26, 'a');
    u8 fl_idx = 0; // flag index;
    u8 fl_pos = 0; // flag correction position

    u16 vip = code[0];
    while(vip != 0xffff) {
        vip = code[0];
        ins.type = Instruction::Type::NOR;

        if(code[4] == 1){
            code[4] = 0;
            ins.type = Instruction::Type::WRITE;
            // putchar(code[3]);
        }

        if(code[6] == 1){
            code[6] = 0;
            ins.type = Instruction::Type::READ;
            code[5] = flag[fl_idx++]; // set dummy data
        }

        ins.src1 = code[vip];
        ins.src1_val = code[ins.src1];

        ins.src2 = code[vip + 1];
        ins.src2_val = code[ins.src2];

        ins.dst = code[vip + 2];

        // this needs to be placed before the assignment
        // because there are instructions that manipulate instruction ptr
        code[0] = vip + 3;

        code[ins.dst] = ~(code[ins.src1] | code[ins.src2]);
        ins.dst_val = code[ins.dst];

        if(ins.dst == 0x1ee && ins.dst_val != 0){
            flag[fl_pos] = printable[prnt_idx];
            cout << "print_idx = " << int(prnt_idx) << "\tmodifying char at pos " << int(fl_pos) << " to " << printable[prnt_idx] << endl;
            cout << flag << endl;

            prnt_idx++;

            if(prnt_idx >= printable.size()) {
                cout << "not found for position " << fl_idx << endl;
                prnt_idx++;
            }

            // begin execution again
            code = code_bak;
            fl_pos = 0;
            fl_idx = 0;
        } else if (ins.dst == 0x1ee && ins.dst_val == 0){
            cout << endl << "fixed char at pos " << int(fl_pos) << " to " << flag[fl_pos] << endl;
            cout << flag << endl;
            fl_pos++;
        }

        if(fl_pos >= 26) break;

        code[1] = rol(code[ins.dst], 1);

        // add this instruction to list of parsed instructions
        // instructions.push_back(ins);
    }

}

void VmContext::Disassemble() {
    for(u16 i = 0; i < instructions.size(); i++) {
        if(instructions[i].src1 == instructions[i].src2 &&
           instructions[i+1].src1 == instructions[i+1].src2 &&
           instructions[i].dst == instructions[i+1].src1) {
            if(instructions[i+1].dst == 0) cout << endl;

            // this is a mov instruction
            cout << "    mov " << "[0x" << hex << instructions[i+1].dst << "], "
                "[0x" << hex << instructions[i].src1 << "]"
                 << "    ; 0x" << hex << instructions[i+1].dst_val
                 << ", 0x" << hex << instructions[i].src1_val << endl;

            // two nor instructions take to make one mov instruction
            i++;
        } else {
            // this is a normal nor instruction
            cout << "    nor " << "[0x" << hex << instructions[i].dst << "], "
                 << "[0x" << hex << instructions[i].src1 << "], "
                 << "[0x" << hex << instructions[i].src2 << "]"
                 << "    ; 0x" << hex << instructions[i].dst_val
                 << ", 0x" << hex << instructions[i].src1_val
                 << ", 0x" << hex << instructions[i].src2_val << endl;
        }
    }
}

/**
 * Read data array from file.
 * This can be used to read u8, u16, u32, u64 arrays from file
 * given at specific offset in file and of specific size.
 *
 * The size of data must be divisible by the size of array requested.
 *
 * @param[out] data Data array returned of type `DType*`.
 * Data array must be pre allocated. Just pass of where to
 * read the whole raw data.
 * @param[in] filename Name of file to read data from.
 * @param[in] offset Offset of data array into file.
 * @param[in] nelems Total number of elements in data array in file.
 *
 * @return void
 * */
template <typename DType>
void GetDataArrayFromFile(DType* data, const string& filename, u64 offset, u64 nelems) {
    assert((data != nullptr) && "NULL PASSED IN DATA POINTER. WHERE SHOULD I READ THE DATA THEN?");

    // open file for reading in binary mode
    ifstream file(filename, std::ios::binary);

    // read data
    file.seekg(offset, ios::beg);
    file.read(reinterpret_cast<char*>(data), sizeof(DType)*nelems);

    // close after all operations done
    file.close();
}

int main() {
    VmContext vm;

    // allocate very large space for the whole VM at the beginning
    vm.code.resize(0x4000);

    // read bytecode into this array
    GetDataArrayFromFile(vm.code.data() + VM_CODE_VM_OFFSET, FILENAME, VM_CODE_FILE_OFFSET, VM_CODE_FILE_SIZE/sizeof(u16));
    vm.code[0] = VM_CODE_VM_OFFSET; // set starting instruction pointer

    // parse all instructions
    // vm.ParseInstructions();
    // vm.Disassemble();
    vm.Solve();

    return EXIT_SUCCESS;
}
```

For disassembling the bytecode, I pass a fake flag filled with ‘a’ (26 character string with only ‘a’). 

```x86asm
Password:Wrong    mov [0x3], [0x1a40]    ; 0x50, 0x50

    mov [0x0], [0x138]    ; 0x13a, 0x13a
    mov [0x4], [0x139]    ; 0x1, 0x1
    mov [0x3], [0x1a3f]    ; 0x61, 0x61

    mov [0x0], [0x14c]    ; 0x14e, 0x14e
    mov [0x4], [0x14d]    ; 0x1, 0x1
    mov [0x3], [0x1a41]    ; 0x73, 0x73

    mov [0x0], [0x160]    ; 0x162, 0x162
    mov [0x4], [0x161]    ; 0x1, 0x1
    mov [0x3], [0x1a41]    ; 0x73, 0x73

    mov [0x0], [0x174]    ; 0x176, 0x176
    mov [0x4], [0x175]    ; 0x1, 0x1
    mov [0x3], [0x1a42]    ; 0x77, 0x77

    mov [0x0], [0x188]    ; 0x18a, 0x18a
    mov [0x4], [0x189]    ; 0x1, 0x1
    mov [0x3], [0x1a3e]    ; 0x6f, 0x6f

    mov [0x0], [0x19c]    ; 0x19e, 0x19e
    mov [0x4], [0x19d]    ; 0x1, 0x1
    mov [0x3], [0x1a3d]    ; 0x72, 0x72

    mov [0x0], [0x1b0]    ; 0x1b2, 0x1b2
    mov [0x4], [0x1b1]    ; 0x1, 0x1
    mov [0x3], [0x1a44]    ; 0x64, 0x64

    mov [0x0], [0x1c4]    ; 0x1c6, 0x1c6
    mov [0x4], [0x1c5]    ; 0x1, 0x1
    mov [0x3], [0x1a48]    ; 0x3a, 0x3a

    mov [0x0], [0x1d8]    ; 0x1da, 0x1da
    mov [0x4], [0x1d9]    ; 0x1, 0x1

    mov [0x0], [0x1e6]    ; 0x1e8, 0x1e8

    mov [0x0], [0x1e7]    ; 0x1ef, 0x1ef

    mov [0x0], [0x1f5]    ; 0x1f7, 0x1f7
    mov [0x6], [0x1f6]    ; 0x1, 0x1
    mov [0x1a23], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x209]    ; 0x20b, 0x20b
    mov [0x6], [0x20a]    ; 0x1, 0x1
    mov [0x1a24], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x21d]    ; 0x21f, 0x21f
    mov [0x6], [0x21e]    ; 0x1, 0x1
    mov [0x1a25], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x231]    ; 0x233, 0x233
    mov [0x6], [0x232]    ; 0x1, 0x1
    mov [0x1a26], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x245]    ; 0x247, 0x247
    mov [0x6], [0x246]    ; 0x1, 0x1
    mov [0x1a27], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x259]    ; 0x25b, 0x25b
    mov [0x6], [0x25a]    ; 0x1, 0x1
    mov [0x1a28], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x26d]    ; 0x26f, 0x26f
    mov [0x6], [0x26e]    ; 0x1, 0x1
    mov [0x1a29], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x281]    ; 0x283, 0x283
    mov [0x6], [0x282]    ; 0x1, 0x1
    mov [0x1a2a], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x295]    ; 0x297, 0x297
    mov [0x6], [0x296]    ; 0x1, 0x1
    mov [0x1a2b], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x2a9]    ; 0x2ab, 0x2ab
    mov [0x6], [0x2aa]    ; 0x1, 0x1
    mov [0x1a2c], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x2bd]    ; 0x2bf, 0x2bf
    mov [0x6], [0x2be]    ; 0x1, 0x1
    mov [0x1a2d], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x2d1]    ; 0x2d3, 0x2d3
    mov [0x6], [0x2d2]    ; 0x1, 0x1
    mov [0x1a2e], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x2e5]    ; 0x2e7, 0x2e7
    mov [0x6], [0x2e6]    ; 0x1, 0x1
    mov [0x1a2f], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x2f9]    ; 0x2fb, 0x2fb
    mov [0x6], [0x2fa]    ; 0x1, 0x1
    mov [0x1a30], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x30d]    ; 0x30f, 0x30f
    mov [0x6], [0x30e]    ; 0x1, 0x1
    mov [0x1a31], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x321]    ; 0x323, 0x323
    mov [0x6], [0x322]    ; 0x1, 0x1
    mov [0x1a32], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x335]    ; 0x337, 0x337
    mov [0x6], [0x336]    ; 0x1, 0x1
    mov [0x1a33], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x349]    ; 0x34b, 0x34b
    mov [0x6], [0x34a]    ; 0x1, 0x1
    mov [0x1a34], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x35d]    ; 0x35f, 0x35f
    mov [0x6], [0x35e]    ; 0x1, 0x1
    mov [0x1a35], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x371]    ; 0x373, 0x373
    mov [0x6], [0x372]    ; 0x1, 0x1
    mov [0x1a36], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x385]    ; 0x387, 0x387
    mov [0x6], [0x386]    ; 0x1, 0x1
    mov [0x1a37], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x399]    ; 0x39b, 0x39b
    mov [0x6], [0x39a]    ; 0x1, 0x1
    mov [0x1a38], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x3ad]    ; 0x3af, 0x3af
    mov [0x6], [0x3ae]    ; 0x1, 0x1
    mov [0x1a39], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x3c1]    ; 0x3c3, 0x3c3
    mov [0x6], [0x3c2]    ; 0x1, 0x1
    mov [0x1a3a], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x3d5]    ; 0x3d7, 0x3d7
    mov [0x6], [0x3d6]    ; 0x1, 0x1
    mov [0x1a3b], [0x5]    ; 0x61, 0x61

    mov [0x0], [0x3e9]    ; 0x3eb, 0x3eb
    mov [0x6], [0x3ea]    ; 0x1, 0x1
    mov [0x1a3c], [0x5]    ; 0x61, 0x61
```

After taking the complete flag as input, there are two things that can happen, either the program checks the flag byte by byte and exits if there is something wrong, or checks the complete flag at once. If it’s former, then it’s the easiest case because we’d just have to maximize the runtime, but if it’s the latter case then it might be painful.

I spent some time analyzing the check method (after taking flag input) and noticed some things :

- If two variables are equal and you have to check this in the `NOR` vm then you take negation of one variable (`nor` with itself) and take `nor` of this new value with the other variable. If the result is zero then these two variables are same, else not.
- there is one specific address that is referenced multiple times, the `[0x1ee]` address. Using the concept above, I noticed that it perfomes some checks on each character of flag and stores the compared value in this address.

This means if our flag is correct then at every stage, we’d have value 0 at this `[0x1ee]` address. 

```x86asm
    ;; 0x1a23 is first character of input
    ;; 0x1a0e is comparision char
    mov [0x0], [0x3fd]    ; 0x400, 0x400
    nor [0x3fe], [0x1a23], [0x1a23]    ; 0xff9e, 0x61, 0x61
    nor [0x3ff], [0x1a0e], [0x1a0e]    ; 0xffa8, 0x57, 0x57

    mov [0x0], [0x40c]    ; 0x40f, 0x40f
    nor [0x40d], [0x1a23], [0x1a23]    ; 0xff9e, 0x61, 0x61
    nor [0x40e], [0x3ff], [0x3ff]    ; 0x57, 0xffa8, 0xffa8
    nor [0x7], [0x40d], [0x40e]    ; 0x20, 0xff9e, 0x57
    mov [0x3ff], [0x7]    ; 0x20, 0x20

    ;; finally comapred value will be stored in [0x1ee] here
    mov [0x0], [0x424]    ; 0x427, 0x427
    nor [0x425], [0x1a0e], [0x1a0e]    ; 0xffa8, 0x57, 0x57
    nor [0x426], [0x3fe], [0x3fe]    ; 0x61, 0xff9e, 0xff9e
    nor [0x7], [0x425], [0x426]    ; 0x16, 0xffa8, 0x61
    mov [0x3fe], [0x7]    ; 0x16, 0x16
    nor [0x7], [0x3fe], [0x3ff]    ; 0xffc9, 0x16, 0x20
    nor [0x1a0d], [0x7], [0x7]    ; 0x36, 0xffc9, 0xffc9
    nor [0x7], [0x1a0d], [0x1ee]    ; 0xffc9, 0x36, 0x0
    nor [0x1ee], [0x7], [0x7]    ; 0x36, 0xffc9, 0xffc9

    ;; 0x1a24 and 0x1a23 are 2nd and 1st characters of input
    mov [0x0], [0x448]    ; 0x44b, 0x44b
    nor [0x449], [0x1a24], [0x1a24]    ; 0xff9e, 0x61, 0x61
    nor [0x44a], [0x1a23], [0x1a23]    ; 0xff9e, 0x61, 0x61

    mov [0x0], [0x457]    ; 0x45a, 0x45a
    nor [0x458], [0x1a24], [0x1a24]    ; 0xff9e, 0x61, 0x61
    nor [0x459], [0x44a], [0x44a]    ; 0x61, 0xff9e, 0xff9e
    nor [0x7], [0x458], [0x459]    ; 0x0, 0xff9e, 0x61
    mov [0x44a], [0x7]    ; 0x0, 0x0

    mov [0x0], [0x46f]    ; 0x472, 0x472
    nor [0x470], [0x1a23], [0x1a23]    ; 0xff9e, 0x61, 0x61
    nor [0x471], [0x449], [0x449]    ; 0x61, 0xff9e, 0xff9e
    nor [0x7], [0x470], [0x471]    ; 0x0, 0xff9e, 0x61
    mov [0x449], [0x7]    ; 0x0, 0x0
    nor [0x7], [0x449], [0x44a]    ; 0xffff, 0x0, 0x0
    nor [0x1a0d], [0x7], [0x7]    ; 0x0, 0xffff, 0xffff

    ;; 0x1a0d should now contain 0x12 because there is a check
    ;; not on 0x1a23 and 0x1a24 but 0x1a0f and 0x1a0d
    mov [0x0], [0x48d]    ; 0x490, 0x490
    nor [0x48e], [0x1a0d], [0x1a0d]    ; 0xffff, 0x0, 0x0
    nor [0x48f], [0x1a0f], [0x1a0f]    ; 0xffed, 0x12, 0x12

    mov [0x0], [0x49c]    ; 0x49f, 0x49f
    nor [0x49d], [0x1a0d], [0x1a0d]    ; 0xffff, 0x0, 0x0
    nor [0x49e], [0x48f], [0x48f]    ; 0x12, 0xffed, 0xffed
    nor [0x7], [0x49d], [0x49e]    ; 0x0, 0xffff, 0x12
    mov [0x48f], [0x7]    ; 0x0, 0x0

    ;;  compared value of 0x1a0d and 0x1a0f is stored in 0x1ee
    mov [0x0], [0x4b4]    ; 0x4b7, 0x4b7
    nor [0x4b5], [0x1a0f], [0x1a0f]    ; 0xffed, 0x12, 0x12
    nor [0x4b6], [0x48e], [0x48e]    ; 0x0, 0xffff, 0xffff
    nor [0x7], [0x4b5], [0x4b6]    ; 0x12, 0xffed, 0x0
    mov [0x48e], [0x7]    ; 0x12, 0x12
    nor [0x7], [0x48e], [0x48f]    ; 0xffed, 0x12, 0x0
    nor [0x1a0d], [0x7], [0x7]    ; 0x12, 0xffed, 0xffed
    nor [0x7], [0x1a0d], [0x1ee]    ; 0xffc9, 0x12, 0x36
    nor [0x1ee], [0x7], [0x7]    ; 0x36, 0xffc9, 0xffc9
```

If our hypothesis is true, then we can just bruteforce this to get the actual flag. We’ll keep modifying the flag until unless we get `[0x1ee]` zero for all characters. You can see this in the C++ code above in the `VmContext::Solve` function.

After running the solve function, we get the solution :

![flag solved](/images/evmbcm-flag-solved.png)

and then putting this as input in the `VmContext::ParseInstructions` method will print this flag.

# Ending Notes

After solving this, I informed Elvis about my solution and turns out this is the shortcut he was referring to. He thought the challenge will be too hard so he made it this way so we can bruteforce to get the solution. The actual expected solution is completely different but amazing. Apparently, even in the CTF, no one solved it the actual way and performed bruteforce like this.

![chat](/images/evmbcm-chatss-1.png)
![chat](/images/evmbcm-chatss-2.png)

This is the source code of this chall : https://github.com/ElvisBlue/magicbox

![chat](/images/evmbcm-chatss-3.png)

And here are some links that he provided :

- [GoogleCTF 2022 - eldar (333 pt / 14 solves)](https://ctf.harrisongreen.me/2022/googlectf/eldar/)
- [The NOR Machine: Build a CPU with Only One Instruction](https://medium.com/pragmatic-programmers/the-nor-machine-build-a-cpu-with-only-one-instruction-c02a9079dec6)
- [Add two integers using only bitwise operators?](https://stackoverflow.com/questions/4068033/add-two-integers-using-only-bitwise-operators)

Also, it would have been much easier if I just spent some time thinking about how to emulate other instructions instead of just `mov`.

![chat](/images/evmbcm-chatss-4.png)

So, this was my solution of this completely different VM challenge. I think I will now try to solve this challenge the way it’s intended to be solved and maybe I’ll do a writeup on that too.
