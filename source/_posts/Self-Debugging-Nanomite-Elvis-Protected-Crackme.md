---
title: Self Debugging (Nanomite) - Elvis Protected Crackme
date: 2023-01-06 02:10:20
tags: ['crackmes', 'reverse-engineering, 'windows', 'nanomite', 'xorenc', 'anti-debug']
categories: ['crackmes', 'windows']
---

# Elvis Protected CrackMe

![WinMain](/images/evpcm-main.png)

If the named mutex `MATESCTF_2019` is not present then the control flows into second function. I debugged the process and it enters into the second one by default as it should (as expected because from the beginning, there are no mutices created automatically). There are interesting things coming… Wait for it!

The decompiled code looks like this. Pretty neat and clean (as expected for windows programs).

<!-- more -->

```cpp
BOOL sub_405290() {
    HMODULE ModuleHandleA; // eax
    int CurrentProcessId; // eax
    BOOL result; // eax
    CHAR Filename[256]; // [esp+0h] [ebp-1D0h] BYREF
    struct _STARTUPINFOA StartupInfo; // [esp+100h] [ebp-D0h] BYREF
    CHAR pidStr[12]; // [esp+14Ch] [ebp-84h] BYREF
    struct _PROCESS_INFORMATION ProcessInformation; // [esp+158h] [ebp-78h] BYREF
    struct _DEBUG_EVENT DebugEvent; // [esp+168h] [ebp-68h] BYREF

		// create a new named mutex and take it's ownership. no child process/thread can take it's ownership (in this case)
    CreateMutexA(0, 1, "MATESCTF_2019");
    
    // shows a message box that the progam knows it's being debugged  and exits
		checkDebuggerPresent();
    
    memset( & StartupInfo, 0, sizeof(StartupInfo));
    StartupInfo.cb = 68; // 68 bytes struct
    
    memset( & ProcessInformation, 0, sizeof(ProcessInformation));

    // get current module (process) handle
    ModuleHandleA = GetModuleHandleA(0);

    // getting filename of this program (basically the filepath)
    GetModuleFileNameA(ModuleHandleA, Filename, 0x100 u);
    sleepRandomlyIGuess();
    
     // get current PID and convert PID to string and store in in pidStr with base 10
     CurrentProcessId = GetCurrentProcessId();
    _itoa(CurrentProcessId, pidStr, 10);
 
    // This process will create another process and attach itself as debugger to the child process
    // Also, it's passing it's own PID to the child program (This is getting interesting)
    if (!CreateProcessA(Filename, pidStr, 0, 0, 0, DEBUG_ONLY_THIS_PROCESS, 0, 0, &StartupInfo, &ProcessInformation))
        showFailedToStartAppMsgBox();

    memset( & DebugEvent, 0, sizeof(DebugEvent));

	  // keep debugging ;-)
    while (1) {
        // wait for debug event and get info in DebugEvent
			  // timeout is 0xffffffff
        result = WaitForDebugEvent( & DebugEvent, 0xFFFFFFFF);
        
				// if no debug event then break
        if (!result)
            break;
	      
				// there are reasons to suspect this!  
				aVMmaybe(&DebugEvent);
        
				// continue execution
				ContinueDebugEvent(DebugEvent.dwProcessId, DebugEvent.dwThreadId, DBG_CONTINUE);
    }
    return result;
}
```

The above code should be pretty clear. 

The check debugger present function contained a XOR encrypted string.

![XOR Encrypted String](/images/evpcm-xorenc-str.png)

![The XOR decryptor to show encrypted message](/images/evpcm-xorenc-decryptor.png)

Wrote a simple XOR decryptor to handle that.

![XOR decryptor in Python](/images/evpcm-xorenc-custom-decryptor.png)

```python
#!/usr/bin/env python3

# One thing I notice now is that this array ends with 0xCC
# and this is xor encrypted.
# Now if we decrypt this with a xorkey, the last byte must be a null byte
# this means 0xCC is the key.
#
# It's just an observation, the key is given in application too!
textarr = [0x8D,0xA2,0xEC,0xA8,0xA9,0xAE,0xB9,0xAB,0xAB,0xA9,0xBE,0xEC,0xA4,0xAD,0xBF,0xEC,0xAE,0xA9,0xA9,0xA2,0xEC,0xAA,0xA3,0xB9,0xA2,0xA8,0xED,0xCC]
textstr = ""

# decrypt text
for t in textarr:
    textstr += chr(t ^ 0xCC)

print(textstr)

captionarr = [0x88,0xA9,0xAE,0xB9,0xAB,0xAB,0xA9,0xBE,0xEC,0xA8,0xA9,0xB8,0xA9,0xAF,0xB8,0xA9,0xA8,0xCC]
captionstr = ""

# decrypt
for c in captionarr:
    captionstr += chr(c ^ 0xCC)

print(captionstr)
```

Clearly this code is checking whether a debugger is present or not.

![Debugger present checker code](/images/evpcm-check-dbgr.png)

The `aVMmaybe` function is this : 

```cpp
HMODULE __cdecl aVMmaybe(struct _DEBUG_EVENT * pDebugEvent) {
    HMODULE result; // eax
    DWORD dwDebugEventCode; // [esp+8h] [ebp-2DCh]
    CONTEXT Context; // [esp+Ch] [ebp-2D8h] BYREF
    union _DEBUG_EVENT::$1CA59A7E570F154F98F56770E4FE79B4 * p_u; // [esp+2E0h] [ebp-4h]

    result = (HMODULE) pDebugEvent;
    dwDebugEventCode = pDebugEvent -> dwDebugEventCode;
    if (pDebugEvent -> dwDebugEventCode == EXCEPTION_DEBUG_EVENT) {
        p_u = & pDebugEvent -> u;
        if (pDebugEvent -> u.Exception.ExceptionRecord.ExceptionCode != EXCEPTION_BREAKPOINT) {
            MessageBoxA(0, "An serious error has been occurred.", "Error", 0);
            ExitProcess(0);
        }

				// went through ReacOS source code to find these enums (defines actually)
        // get thread context based on ContextFlags field
				Context.ContextFlags = CONTEXT_CONTROL | CONTEXT_INTEGER;
        result = (HMODULE) GetThreadContext(DebugEventUnion.Exception.ExceptionRecord.ExceptionRecord, & Context);
        
				// this looks spooky and also the above GetThreadContext call
				if (Context.Eip > DebugEventUnion.LoadDll.nDebugInfoSize &&
            Context.Eip < DebugEventUnion.LoadDll.nDebugInfoSize + 0x10000) {
            runVMMaybe( & Context, & DebugEventUnion);
            return (HMODULE) SetThreadContext(DebugEventUnion.Exception.ExceptionRecord.ExceptionRecord, & Context);
        }
    } else if (dwDebugEventCode == CREATE_PROCESS_DEBUG_EVENT) {
        qmemcpy( & DebugEventUnion, & pDebugEvent -> u, 0x28 u);
        result = GetModuleHandleA(0);
        if (pDebugEvent -> u.Exception.ExceptionRecord.ExceptionAddress != result)
            showFailedToStartAppMsgBox();
    } else if (dwDebugEventCode == EXIT_PROCESS_DEBUG_EVENT) {
        ExitProcess(0);
    }
    return result;
}
```

The call to `GetThreadContext` call looks strange and so does comparision of `Eip` with some random number. This might be because the given data type is actually a union so IDA is confusing between possible values.

![GetThreadContext Function](/images/windoc-get-thread-context.png)

Clearly the first parameter to `GetThreadContext` call must be a `HANDLE` type but it looks like it’s something else. Out of all possible values inside a `DEBUG_EVENT`, I found `CREATE_PROCESS_DEBUG_INFO` struct more appealing than others. If not the call to `GetThreadContext` makes you suspicious, the sudden change in data type should atleasy interest you if you’re attentive enough. From `DebugEventUnion.Exception` to directly `DebugEventUnion.LoadDll`. I tried changing the type to `CREATE_PROCESS_DEBUG_INFO` and suddenly the program started making more sense.

![DEBUG_EVENT Structure](/images/windoc-debug-event.png)
![CREATE_PROCESS_DEBUG_INFO Structure](/images/windoc-create-process-debug-info.png)

After undefining the data type, I changed it to this. I don’t remember correctly whether IDA directly detected this area is a Union or did I convert it’s type, but it whichever case it was, it lead to the correct path.

![Experimenting with struct type](/images/evpcm-change-var-type-create-process-dbg-info.png)

This still doesn’t look good since, the even type is `EXCEPTION_DEBUG_EVENT` and it’s using `CREATE_PROCESS_DEBUG_INFO`? How is that possible. I tried changing the type to `EXCEPTION_DEBUG_INFO` and it again makes sense.

![Does this make any sense?](/images/evpcm-trying-to-make-sense.png)

The thread part still doesn’t make sense but… Let’s keep these two candidates in mind and move fwd. I’ll move on with `CREATE_PROCESS_DEBUG_INFO` type because that explains the thread and `Eip` part.

The `_CONTEXT` structure is new to me. It represents the current state of CPU during thread switch and debug events. Defined as follows : 

```cpp
/**
 * Contains processor-specific register data. The system uses CONTEXT
 * structures to perform various internal operations. Refer to the
 * header file WinNT.h for definitions of this structure for each
 * processor architecture.
 */

typedef struct _CONTEXT {
  DWORD64 P1Home;
  DWORD64 P2Home;
  DWORD64 P3Home;
  DWORD64 P4Home;
  DWORD64 P5Home;
  DWORD64 P6Home;
  DWORD   ContextFlags;
  DWORD   MxCsr;
  WORD    SegCs;
  WORD    SegDs;
  WORD    SegEs;
  WORD    SegFs;
  WORD    SegGs;
  WORD    SegSs;
  DWORD   EFlags;
  DWORD64 Dr0;
  DWORD64 Dr1;
  DWORD64 Dr2;
  DWORD64 Dr3;
  DWORD64 Dr6;
  DWORD64 Dr7;
  DWORD64 Rax;
  DWORD64 Rcx;
  DWORD64 Rdx;
  DWORD64 Rbx;
  DWORD64 Rsp;
  DWORD64 Rbp;
  DWORD64 Rsi;
  DWORD64 Rdi;
  DWORD64 R8;
  DWORD64 R9;
  DWORD64 R10;
  DWORD64 R11;
  DWORD64 R12;
  DWORD64 R13;
  DWORD64 R14;
  DWORD64 R15;
  DWORD64 Rip;
  union {
    XMM_SAVE_AREA32 FltSave;
    NEON128         Q[16];
    ULONGLONG       D[32];
    struct {
      M128A Header[2];
      M128A Legacy[8];
      M128A Xmm0;
      M128A Xmm1;
      M128A Xmm2;
      M128A Xmm3;
      M128A Xmm4;
      M128A Xmm5;
      M128A Xmm6;
      M128A Xmm7;
      M128A Xmm8;
      M128A Xmm9;
      M128A Xmm10;
      M128A Xmm11;
      M128A Xmm12;
      M128A Xmm13;
      M128A Xmm14;
      M128A Xmm15;
    } DUMMYSTRUCTNAME;
    DWORD           S[32];
  } DUMMYUNIONNAME;
  M128A   VectorRegister[26];
  DWORD64 VectorControl;
  DWORD64 DebugControl;
  DWORD64 LastBranchToRip;
  DWORD64 LastBranchFromRip;
  DWORD64 LastExceptionToRip;
  DWORD64 LastExceptionFromRip;
} CONTEXT, *PCONTEXT;
```

There is not much explanation on the fields of this struct on Windows documentation site but working on previous crackmes taught me a few things (like reading source code is always better).

I went through the ReactOS source code to find possible `ContextFlag` values to understand what the program is doing.

![ContextFlags](/images/reactos-context-flags.png)

`0x10003` seems to be value obtained after OR of `CONTEXT_i386`, `CONTEXT_CONTROL` and `CONTEXT_INTEGER`. 

The `runVMMaybe` function looks like this:

```cpp
BOOL __cdecl runVMMaybe(CONTEXT * pContext, CREATE_PROCESS_DEBUG_INFO * pCreateProcessDebugInfo) {
    BOOL result; // eax
    int v3; // eax
    DWORD v4; // eax
    int v5[2]; // [esp+10h] [ebp-90h] BYREF
    int v6; // [esp+18h] [ebp-88h]
    int v7; // [esp+1Ch] [ebp-84h]
    DWORD v8; // [esp+20h] [ebp-80h]
    DWORD v9; // [esp+24h] [ebp-7Ch]
    const void * v10; // [esp+28h] [ebp-78h] BYREF
    unsigned int v11; // [esp+2Ch] [ebp-74h]
    int v12; // [esp+30h] [ebp-70h]
    int v13; // [esp+34h] [ebp-6Ch]
    int v14; // [esp+38h] [ebp-68h]
    int v15; // [esp+3Ch] [ebp-64h]
    int v16; // [esp+40h] [ebp-60h]
    int v17; // [esp+44h] [ebp-5Ch]
    int v18; // [esp+48h] [ebp-58h]
    char v19; // [esp+4Eh] [ebp-52h]
    char v20; // [esp+4Fh] [ebp-51h]
    int v21[2]; // [esp+50h] [ebp-50h] BYREF
    int v22; // [esp+58h] [ebp-48h]
    int v23; // [esp+5Ch] [ebp-44h]
    int v24; // [esp+60h] [ebp-40h] BYREF
    int v25; // [esp+64h] [ebp-3Ch] BYREF
    int v26; // [esp+68h] [ebp-38h]
    int v27; // [esp+6Ch] [ebp-34h]
    int v28; // [esp+70h] [ebp-30h]
    int v29; // [esp+74h] [ebp-2Ch]
    int v30; // [esp+78h] [ebp-28h]
    int v31; // [esp+7Ch] [ebp-24h]
    char v32; // [esp+83h] [ebp-1Dh] BYREF
    SIZE_T NumberOfBytesWritten; // [esp+84h] [ebp-1Ch] BYREF
    LPCVOID lpBaseAddress; // [esp+88h] [ebp-18h]
    int Buffer[2]; // [esp+8Ch] [ebp-14h] BYREF
    __int16 v36; // [esp+94h] [ebp-Ch]
    SIZE_T NumberOfBytesRead; // [esp+9Ch] [ebp-4h] BYREF

    Buffer[0] = 0;
    Buffer[1] = 0;
    v36 = 0;
    if (byte_40F86D && byte_40F86E) {
        WriteProcessMemory(
            pCreateProcessDebugInfo -> hProcess,
            (LPVOID)(pContext -> Eip - 1), &
            unk_40F86C,
            1 u, &
            NumberOfBytesWritten);
        FlushInstructionCache(pCreateProcessDebugInfo -> hProcess, (LPCVOID)(pContext -> Eip - 1), 1 u);
        byte_40F86D = 0;
    }
    ReadProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPCVOID)(pContext -> Eip - 1), Buffer, 5 u, & NumberOfBytesRead);
    if (Buffer[0] == unk_40D168) {
        --pContext -> Eip;
        byte_40F86E = 0;
        return 1;
    } else {
        if (!memcmp(Buffer, & unk_40D170, 5 u)) {
            pContext -> Eip += 4;
            lpBaseAddress = (LPCVOID) pContext -> Eip;
            byte_40F86E = 1;
        } else if (byte_40F86E) {
            switch (LOBYTE(Buffer[0])) {
            case 0:
                v3 = sub_404480(SBYTE2(Buffer[0]), pContext);
                sub_404550(SBYTE1(Buffer[0]), v3, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 1:
                sub_404550(SBYTE1(Buffer[0]), BYTE2(Buffer[0]), pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 2:
                v30 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v31 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v30 ^= v31;
                sub_404550(SBYTE1(Buffer[0]), v30, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 3:
                v28 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v29 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v28 -= v29;
                sub_404550(SBYTE1(Buffer[0]), v28, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 4:
                v26 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v27 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v26 += v27;
                sub_404550(SBYTE1(Buffer[0]), v26, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 5:
                v25 = sub_404480(SBYTE1(Buffer[0]), pContext);
                pContext -> Esp -= 4;
                WriteProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPVOID) pContext -> Esp, & v25, 4 u, & NumberOfBytesWritten);
                lpBaseAddress = (LPCVOID) ++pContext -> Eip;
                break;
            case 6:
                ReadProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPCVOID) pContext -> Esp, & v24, 4 u, & NumberOfBytesRead);
                sub_404550(SBYTE1(Buffer[0]), v24, pContext);
                pContext -> Esp += 4;
                lpBaseAddress = (LPCVOID) ++pContext -> Eip;
                break;
            case 7:
                v21[1] = sub_404480(SBYTE1(Buffer[0]), pContext);
                v22 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v23 = sub_404480(SHIBYTE(Buffer[0]), pContext);
                v21[0] = 0;
                ReadProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPCVOID)(v23 + v22), v21, 1 u, & NumberOfBytesRead);
                sub_404550(SBYTE1(Buffer[0]), v21[0], pContext);
                pContext -> Eip += 3;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 8:
                v20 = BYTE1(Buffer[0]);
                pContext -> Eip += SBYTE1(Buffer[0]) + 1;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 9:
                ++pContext -> Eip;
                if ((pContext -> EFlags & 0x40) != 0) {
                    v19 = BYTE1(Buffer[0]);
                    pContext -> Eip += SBYTE1(Buffer[0]);
                }
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0xA:
                v17 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v18 = sub_404480(SBYTE2(Buffer[0]), pContext);
                if (v17 == v18)
                    v4 = pContext -> EFlags | 0x40;
                else
                    v4 = pContext -> EFlags & 0xFFFFFFBF;
                pContext -> EFlags = v4;
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0xB:
                v15 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v16 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v15 &= v16;
                sub_404550(SBYTE1(Buffer[0]), v15, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0xC:
                v13 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v14 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v13 <<= v14;
                sub_404550(SBYTE1(Buffer[0]), v13, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0xD:
                v11 = sub_404480(SBYTE1(Buffer[0]), pContext);
                v12 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v11 >>= v12;
                sub_404550(SBYTE1(Buffer[0]), v11, pContext);
                pContext -> Eip += 2;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0xE:
                v10 = (const void * )(pContext -> Eip + 1);
                pContext -> Esp -= 4;
                WriteProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPVOID) pContext -> Esp, & v10, 4 u, & NumberOfBytesWritten);
                v9 = sub_404480(SBYTE1(Buffer[0]), pContext);
                pContext -> Eip = v9;
                lpBaseAddress = v10;
                break;
            case 0xF:
                v8 = sub_404480(SBYTE1(Buffer[0]), pContext);
                pContext -> Eip = v8;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0x10:
                v5[1] = sub_404480(SBYTE1(Buffer[0]), pContext);
                v6 = sub_404480(SBYTE2(Buffer[0]), pContext);
                v7 = sub_404480(SHIBYTE(Buffer[0]), pContext);
                v5[0] = 0;
                ReadProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPCVOID)(v7 + v6), v5, 4 u, & NumberOfBytesRead);
                sub_404550(SBYTE1(Buffer[0]), v5[0], pContext);
                pContext -> Eip += 3;
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            case 0x11:
                ++pContext -> Eip;
                if ((pContext -> EFlags & 0x40) == 0)
                    pContext -> Eip += SBYTE1(Buffer[0]);
                lpBaseAddress = (LPCVOID) pContext -> Eip;
                break;
            default:
                break;
            }
        }
        v32 = -52;
        ReadProcessMemory(pCreateProcessDebugInfo -> hProcess, lpBaseAddress, & unk_40F86C, 1 u, & NumberOfBytesRead);
        WriteProcessMemory(pCreateProcessDebugInfo -> hProcess, (LPVOID) lpBaseAddress, & v32, 1 u, & NumberOfBytesWritten);
        result = FlushInstructionCache(pCreateProcessDebugInfo -> hProcess, lpBaseAddress, 1 u);
        byte_40F86D = 1;
    }
    return result;
}
```

I rename those `byte_xxxx` and `unk_xxxx` to something that I can identify.

At this point I think the following things are going on : 

- The parent process creates a new named mutex and creates a child process.
- It does all the checking whether a debugger is attached or not. But this really doesn’t matter because it’s just the first step of anti-debug. Attaching itself as debugger for the child process is the real anti-debug most probably.
- The child can probably access the mutex and using the mutex, they control the common data region, creating some type of IPC (inter process comm.). I don’t really know whether a child can access parent’s mutices or not but from the documentation, any process can request acess to a named mutex.
- Now since the first time program ran, no mutex was present, the second function ran but now there exists a mutex with name **MATESCTF_2019** and hence the first function will run.
- I haven’t reversed that function yet but I think that’ll send debug events to the parent process to let it control the execution flow.

Let’s take a look at how that function looks.

![Instance count checker function](/images/evpcm-instance-count-checker.png)

To check mutliple instances of child aren’t running, it’ll create another named mutex for the first time and then try opening it the next time (if by mistake) it is launched. If it opened then this means another instance of child is already running.

![Before rename](/images/evpcm-fn-name-before-rename.png)

This function will get command line arguments (remember, parent process passed PID into it) and convert it to integer. Then it’s storing the result it got from that `sub_405410` function after xorring it with some other values. The whole point is that this is a special value being stored somewhere in the program.

![After rename](/images/evpcm-fn-name-after-rename.png)

Next we check `DialogFunc`

```cpp
INT_PTR __stdcall DialogFunc(HWND hDlg, UINT a2, WPARAM a3, LPARAM a4) {
    CHAR String[260]; // [esp+8h] [ebp-108h] BYREF

    if (a2 == 16) {
        EndDialog(hDlg, 0);
    } else if (a2 == 272) {
				// reference to this again!
        if (some_special_value != 0x4978BBEB)
            showAreYouTryingToAttackMsgBox(hDlg);
    } else if (a2 == 273 && a3 == 1002) {
        memset(String, 0, 0x100 u);
        GetDlgItemTextA(hDlg, 1001, String, 256);
        ((void(__cdecl * )(HWND, CHAR * , int)) loc_401390)(hDlg, String, some_special_value);
    }
    return 0;
}
```

Wanna take a look at what at `loc_401390`?

![loc_401390](/images/evpcm-loc_401390.png)

Treasure!! I wonder what those 0xCC at the beginning of the image are!? If you scroll down a bit, you’ll notice something more amazing!

![Is this a VM bytecode?](/images/evpcm-is-this-a-bytecode.png)

Looks like some type of bytecode? If you tread all these values as bytes, the values 0x03, 0x04, 0x02 are repeating a lot as you can already see. I am not sure but let’s keep this in mind while reversing. References to any odd address and we should compare that with this address.

Back to the original disassembly. Btw, somehow, I don’t know why, IDA can’t decompile this assembly.

![loc_401390](/images/evpcm-loc_401390-zoomed.png)

Let’s check what these function hold!

![sub_401000](/images/evpcm-fn1.png)

This looks like it’s getting text from the window.

![GetTextWindowA](/images/windoc-get-text-windowa.png)

Onto the next function

![sub_401060](/images/evpcm-sub_401060.png)

… and I think we are reaching somewhere!

Next one…

```cpp
BOOL __stdcall sub_401080(HWND hWnd) {
    int v2; // [esp+0h] [ebp-19Ch]
    void * Src; // [esp+1Ch] [ebp-180h]
    void * lpBuffer; // [esp+20h] [ebp-17Ch]
    struct _STARTUPINFOA StartupInfo; // [esp+24h] [ebp-178h] BYREF
    HMODULE hModule; // [esp+6Ch] [ebp-130h]
    HRSRC hResInfo; // [esp+70h] [ebp-12Ch]
    CHAR String; // [esp+74h] [ebp-128h] BYREF
    _BYTE v9[263]; // [esp+75h] [ebp-127h] BYREF
    HANDLE hFile; // [esp+17Ch] [ebp-20h]
    struct _PROCESS_INFORMATION ProcessInformation; // [esp+180h] [ebp-1Ch] BYREF
    HGLOBAL hResData; // [esp+190h] [ebp-Ch]
    DWORD NumberOfBytesWritten; // [esp+194h] [ebp-8h] BYREF
    DWORD nNumberOfBytesToWrite; // [esp+198h] [ebp-4h]

    MessageBoxA(hWnd, "Correct security key. Application unlocked!", "Correct key", 0x40 u);
    GetDlgItemTextA(hWnd, 1001, & String, 256);
    hModule = GetModuleHandleA(0);
    hResInfo = FindResourceA(hModule, (LPCSTR) 0x67, "PROTECTED");
    hResData = LoadResource(hModule, hResInfo);
    nNumberOfBytesToWrite = SizeofResource(hModule, hResInfo);
    Src = LockResource(hResData);
    lpBuffer = malloc(nNumberOfBytesToWrite);
    memcpy_0(lpBuffer, Src, nNumberOfBytesToWrite);
    if (operator new(0x40C u))
        v2 = sub_4055B0( & String, & v9[strlen( & String)] - v9);
    else
        v2 = 0;
    *(_DWORD * ) & v9[259] = v2;
    sub_405710(lpBuffer, nNumberOfBytesToWrite);
    hFile = CreateFileA("Credits.exe", 0x40000000 u, 0, 0, 2 u, 0x80 u, 0);
    if (hFile == (HANDLE) - 1) {
        MessageBoxA(hWnd, "Failed to write flag file!", "Ops", 0x30 u);
    } else if (WriteFile(hFile, lpBuffer, nNumberOfBytesToWrite, & NumberOfBytesWritten, 0)) {
        CloseHandle(hFile);
        ShowWindow(hWnd, 0);
        memset( & StartupInfo, 0, sizeof(StartupInfo));
        StartupInfo.cb = 68;
        memset( & ProcessInformation, 0, sizeof(ProcessInformation));
        if (CreateProcessA("Credits.exe", 0, 0, 0, 1, 0, 0, 0, & StartupInfo, & ProcessInformation)) {
            WaitForSingleObject(ProcessInformation.hProcess, 0xFFFFFFFF);
            CloseHandle(ProcessInformation.hProcess);
            CloseHandle(ProcessInformation.hThread);
        }
        DeleteFileA("Credits.exe");
    } else {
        MessageBoxA(hWnd, "Failed to write flag file!", "Ops", 0x30 u);
        CloseHandle(hFile);
    }
    free(lpBuffer);
    return EndDialog(hWnd, 0);
}
```

By reading the strings, I am guessing that it’ll create another process named `Credits.exe` and will probably display the flag there. This function must be called after we defeat the protection I guess. Let’s check whether that’s true or not.

This challenge is amazing because I’m somehow not getting bored by it!

![Detected VM Opcodes!!](/images/evpcm-detected-vm-opcodes.png)

I was right with the VM part I guess. I actually felt kinda strange about this part of code. There can be only a few cases when there are multiple add instructions :

- Either the disassembly is wrong
- Or it’s a data section! ☑️
- Some other cause I haven’t encountered yet! 😅

In our case, it’s the first and second one together. That huge data after this disassembly that I said can be bytecodes of a VM also had lots of 0x03, 0x04 and 0x02. This also has that. So understanding the VM Dispatcher (Interpreter) is now the next part of this whole thing mostly!

---

## Help From A Paper : **Resilient Self-Debugging Software Protection**

I was randomly searching going through some researchgate recommendations when I encountered [this](https://www.researchgate.net/publication/340644327_Resilient_Self-Debugging_Software_Protection) paper. It gives intro on a new type of software protection which protects the dynamic analysis of protected code. The reason I’m mentioning this here is because, this paper slightly introduces workings of this challenge. I took a printout and read it (almost complete atm). So here is how the protection system works : 

### **Identifying Roles (Self Debugger and Protected Application)**

The program will first launch and check whether it’s the parent or child process. It’ll then create a fork of itself and that child will also automatically check whether it’s a child or a parent process (because code for both of them is exactly same). By this mechanism they both know whether they are child or parent process. 

In case of our binary, this is done by checking whether there exists a named mutex (”**MATESCTF_2019**”). At this point I also realize that ********MATE******** stands for **M**an **A**t **T**he **E**nd which is mentioned in the paper, and I think there might be some relation between this CTF/Challenge and this paper but I havent yet researched into that.

### **************The Protection System**************

The protection system works by setting up a `mini-debugger` in the parent process and a `migrated-code`  in child process. The task of this `mini-debugger` is to handle expections/interrupts raised from the child process. It’s not a complete debugger but instead it handles only some of these interrupts and exceptions. In this case, it might also be possible that how it handles the interrupt or expection is completely different from how normal debuggers handle that, because there the goal is not to debug the program but to create a protection system based on the **debugger privileges**.

The `migrated-code` is just a **********************transformed********************** version of the original code that contains code segments to trigger the `mini-debugger` in the parent process. The parent process here is called the `self-debugger` and the child process is called the `protected application`. This `mini-debugger` can be triggered when the protected program needs protect some special function calls or protect some encryption functions. You can be creative about that.

The `self-debugger` waits in a `while(true)` loop to keep polling for debug events. Once it gets a signal, it’ll take control of the protected application using it’s **************************debugger privileges************************** and do things like getting the `CONTEXT` of CPU, reading the debug event and certain areas in program memory to determine why the protected application triggered it and what steps it should take next.

In our case, the application is using a VM inside mini-debugger to know what to do. The `migrated-code` is the VM code that this VM inside the `mini-debugger` executes. 

### Advantages and Disadvantages

The major advantage of using this type of protection system is that once you detach or kill the `self-debugger`, the protected application can no longer function correctly because it was the `self-debugger` process that was actually controlling the control flow of the `migrated-code`. This make up for a good anti-debug part.

The paper proposes two ways to defeat this protection system : 

- By detaching the debugger (if it’s possible)
- By keeping the debugger attached

By **detaching the debugger** if possible, you can take control of the protected application. To deal with the `migrated-code` you might need to reverse those and deal with them (like patching) such that detaching the debugger and attaching your own `hostile-debugger` doesn’t stop the application from running. To fasten up reversing, one can scan binary for hardcoded breakpoints (if used) or code that generates exceptions (like accessing value at `nullpointer`).

By **keeping the debugger attached**, instead of attacking the protected application, one can attack the `self-debugger` itself. The paper states : 

> Attackers can attach their debugger directly to the self debugger and use it’s privileges to subvert the protection, effectively turning the self debugger into their own `hostile-debugger`!
> 

That sounds interesting. If not debuggers, one can try things like ******DBI****** (Dynamic Binary Instrumentation) or **Emulators** (like QEMU) to emulate the `self-debugger`. Using emulators might not work sometimes because some protection systems can detect whether it’s being used in an emulator or not by executing unusual instruction. In this case the protected application can just execute an unusual instruction (not implemented by major emulators) and then if there is an exception raised, the debugger can catch the exception and halt the execution.

### Better Design : Reciprocal Debugging

The paper also introduces `reciprocal-debugging` approach to make this system stronger where the child and parent process both debug each other and execution depends on `mini-debugger` present in both the processes. Hence one wont be able to detach any of those without proper tools. There are also some other interesting things that the paper introduces and you might want to read it.

## Back To The Challenge

This paper made our work almost easy. Now we know the protection system and we have atleast one way to defeat it (I have a feeling there might be multiple). We can statically analyze the VM and check what it’s opcodes are doing and since we already have the migrated code bytecode and have an idea on high level what it might be doing, we might write our own disassembler for this and use the bytecode to reverse the protected application.

Readig the paper also adds more to the confidence on decision of changing the union type to `CREATE_PROCESS_DEBUG_INFO`.

## Reversing The Virtual Machine

![Why write to memory?](/images/evpcm-insn-cache-not-flushed.png)
![WriteProcessMemory](/images/windoc-write-process-memory.png)

We also might be seeing some deadly polymorphism here (maybe)

![FlushInstructionCache](/images/windoc-flush-instruction-cache.png)
![FlushInstructionCache Parameters](/images/windoc-flush-instruction-cache-parameters.png)

Next we have the following code :

![Explanation](/images/evpcm-detailed-ss.png)

Now analyzing `ufn1` and `ufn2` will tell us that these are nothing but `getters` and `setters` for `EAX`, `EBX`, `ECX`, …, registers.

`ufn1` is 

![ufn1](/images/evpcm-unfn1.png)

and `ufn2` is

![ufn2](/images/evpcm-ufn2.png)

After this the `vm-ispacher` makes more sense.

![setRegisterByte](/images/evpcm-set-reg-byte.png)

clearly case 0 is the `mov reg1, reg2` instruction in the VM and similary we can process all other opcodes. We can now start analyzing this and write our simple disassembler.

At the end of this function there is code to add breakpoints so that before next VM instruction executes, the `mini-debugger` is invoked. After the control is back to `mini-debugger` the `self-debugger` places the replaced byte by the actual byte and the executes it as if nothing changed. This is how actual debuggers work too when you place a breakpoint somewhere.

![Placing a breakpoint](/images/evpcm-place-breakpoint.png)

This also means that the `bInstructionCacheNotFlushed` variable actually is `bBreakpointActive`. Therefore, this code now makes more sense : 

![Rename to bBreakpointActive](/images/evpcm-rename-breakpoint-active.png)

## The VM Emulator

```python
#!/usr/bin/env python3

bindata = []
f = open('Protected.exe', 'rb')
bindata = f.read()[:]
f.close()

# base address of binary when loaded
# binbase = 0x200401000
binbase = 0

# register names and values
regNames = ['none', 'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'eip', 'ebp']
regVals = [0 for r in regNames]

eflags = 0
eip = 8

# stack
stack = [int(0) for i in range(100)]
stack[99] = 0x0
stack[98] = 0x400 # address of xorcmp func
stack[97] = 0x800 # address of input string
stack[96] = 0x460 # address of pleaseTryAgain func
stack[96] = 0x480 # address of success fun
stack[94] = 0x900 # address of hdlg
stack[93] = 0xa00 # address of specVal
top = 92

# emulator loop

regVals[eip] = 0x7b8
def disassemble():
    global regVals
    global regNames
    global bindata
    global eip
    global eflags
    global stack
    global top
    global binbase

    while regVals[eip] < 0x4000:
        # get current opcode
        opcode = bindata[regVals[eip]]

        print(hex(regVals[eip]), '\t : ', end = '')

        # mov reg1, reg2
        if opcode == 0:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] = regVals[reg2]
            regVals[eip] += 2
            print(f'mov {regNames[reg1]}, {regNames[reg2]}\t; {regVals[reg1]}')

        # mov reg, imm
        elif opcode == 1:
            reg = bindata[regVals[eip]+1]
            imm = bindata[regVals[eip]+2]
            regVals[reg] = imm
            regVals[eip] += 2
            print(f'mov {regNames[reg]}, {hex(imm)}\t; {hex(regVals[reg])}')

        # xor reg1, reg2
        elif opcode == 2:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] ^= regVals[reg2]
            regVals[eip] += 2
            print(f'xor {regNames[reg1]}, {regNames[reg2]}')

        # sub reg1, reg2
        elif opcode == 3:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] -= regVals[reg2]
            regVals[eip] += 2
            print(f'sub {regNames[reg1]}, {regNames[reg2]}')

        # add reg1, reg2
        elif opcode == 4:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] += regVals[reg2]
            regVals[eip] += 2
            print(f'add {regNames[reg1]}, {regNames[reg2]}')

        # push reg
        elif opcode == 5:
            reg = bindata[regVals[eip]+1]
            stack[top] = regVals[reg]
            top -= 1
            regVals[eip] += 1
            print(f'push {regNames[reg]}')

        # pop reg
        elif opcode == 6:
            reg = bindata[regVals[eip]+1]
            top += 1
            regVals[reg] = stack[top]
            regVals[eip] += 1
            print(f'pop {regNames[reg]}')

        # mov reg1, byte ptr [reg2:reg3]
        elif opcode == 7:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            reg3 = bindata[regVals[eip]+3]
            # compute read address
            readaddr = regVals[reg2] + regVals[reg3] - binbase
            regVals[reg1] = bindata[readaddr]
            regVals[eip] += 3
            print(f'mov {regNames[reg1]}, byte ptr[{regNames[reg2]}:{regNames[reg3]}]\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}, {hex(regVals[reg3])}')

        # jmp near imm
        elif opcode == 8:
            imm = bindata[regVals[eip]+1]
            regVals[eip] += imm + 1
            print(f'jmp {hex(regVals[eip] + 1)}')

        # jne imm
        elif opcode == 9:
            regVals[eip] += 1
            if (eflags & 0x40) != 0:
                imm = bindata[regVals[eip]]
                regVals[eip] += imm
            print(f'je {hex(regVals[eip] + 1)};\t{hex(eflags & 0x40)}')

        # cmp reg1, reg2
        elif opcode == 10:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            if regVals[reg1] == regVals[reg2]:
                eflags |= 0x40
            else:
                eflags &= 0xffffffbf
            regVals[eip] += 2
            print(f'cmp {regNames[reg1]}, {regNames[reg2]}\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}')

        # and reg1, reg2
        elif opcode == 11:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] &= regVals[reg2]
            regVals[eip] += 2
            print(f'and {regNames[reg1]}, {regNames[reg2]}\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}')

        # shl reg1, reg2
        elif opcode == 12:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] <<= regVals[reg2]
            regVals[eip] += 2
            print(f'shl {regNames[reg1]}, {regNames[reg2]}\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}')

        # shr reg1, reg2
        elif opcode == 13:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            regVals[reg1] >>= regVals[reg2]
            regVals[eip] += 2
            print(f'shr {regNames[reg1]}, {regNames[reg2]}\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}')

        # call reg
        elif opcode == 14:
            stack[top] = regVals[eip] + 1
            top += 1
            reg = bindata[regVals[eip]+1]
            regVals[eip] = regVals[reg]
            print(f'call {regNames[reg]}\t; {hex(regVals[reg])}')

        # jmp reg
        elif opcode == 15:
            reg = bindata[regVals[eip]+1]
            regVals[eip] = regVals[reg]
            print(f'jmp {hex(regVals[eip] + 1)}')

        # mov reg, dword ptr [reg2:reg3]
        elif opcode == 16:
            reg1 = bindata[regVals[eip]+1]
            reg2 = bindata[regVals[eip]+2]
            reg3 = bindata[regVals[eip]+3]

            if reg2 == 7: # esp
                regVals[reg1] = stack[top + int(regVals[reg3]/4) + 1]
            else:
                readaddr = regVals[reg2] + regVals[reg3] - binbase
                regVals[reg1] = int.from_bytes(bytearray(bindata[readaddr : readaddr + 4]), 'little')

            regVals[eip] += 3
            print(f'mov {regNames[reg1]}, dword ptr [{regNames[reg2]}:{regNames[reg3]}]\t; {hex(regVals[reg1])}, {hex(regVals[reg2])}, {hex(regVals[reg3])}')

        # je near imm
        elif opcode == 17:
            regVals[eip] += 1
            if (eflags & 0x40) == 0:
                imm = bindata[regVals[eip]]
                regVals[eip] += imm
            print(f'jne {hex(regVals[eip]+1)}\t;')
        else:
            print('INVALID_OPCODE')
            regVals[eip] += 1

        regVals[eip] += 1

# disassemble()

try:
    disassemble()
except:
    print("\n=============== ERROR ==================")

    print("REGISTER DUMP :")
    for r in range(len(regNames)):
        print(f'\t{regNames[r]} = {hex(regVals[r])}')

    pstart = regVals[eip]
    pend = regVals[eip] + 4

    print('ERROR NEAR : ')
    print(f'\tvm::{hex(regVals[eip])} - {bindata[pstart : pend]}')
    print('==========================================')
```

I don’t know how long exactly is the VM code so I set the max instruction pointer to 0x4000. This is a hit and trial method to get all the disassembly as the disassembler will automatically exit when there’s an error.

![VM Emulator error](/images/evpcm-show-vm-emu-error.png)

Cleary instructions upto 0x3455 is valid and after that, everything looks invalid. Now we have a few options. We can either reverse all this code, or try to uplift it to make it easier to read. I had some talk with the challenge author few days back and he hinted to replace the `migrated-code` with this actual assembly code. This way, IDA can uplift (decompile) this part of code automatically for us. Luckily this is very easy and possible. We just have to generate this disassembly, fix all the dummy values we used for stack and ask `pwntools` to assemble this and patch the binary with the retrieved bytes. Let’s give that a try!

********************************************************************This disassembly took me almost one week because I missed changing `reg` to `reg1` in one of the instructions which made the disassembly wrong and the decompilations were incorrect!** 😭

### Big Mistake!

After working on this for a while I figured out that the size of reversed assembly code is much greater than the space available (after removing the VM bytecode) so I now try a different approach. I can write this assembly to a file and do some cleaning of code and compile it to a program and then ask IDA or some other tool to reverse this. What we can also do is forcefully inject the assembly code into the protected program and do some relocations to make everything work (confirmed by author). But during a CTF that might be an overkill if you don’t have tools and don’t know how to do it. My circuits are now kinda getting fried by this chall and I now wish to move on ASAP so I follow the former approach, but at the same time this also motivates me to write a tool for this and learn about that. Maybe after few days I’ll try the former approach.

The generated assembly is more than 3500 lines so you can get it form [this pastebin](https://pastebin.com/16d1u9ph)

I’ve deleted some last lines of assembly code to make this compile properly.

This will give us a clean decompiled code like this :

![Decompiled Reversed Code](/images/evpcm-compiled-solution-decompiled.png)

Using this we can get the first 15 bytes of the flag.

The last assembly that I deleted does this : 

```x86asm
    ;; get 16th byte in eax
    mov ecx, 0xf
    mov eax, byte ptr[esi:ecx]

    ;; shift lower byte to 2nd byte position
    ;; and add 17th byte to make lower byte equal
    ;; to 17th byte in string
    mov ecx, 0x8    ; 0x8
    shl eax, ecx    ; 0x300, 0x8
    mov ecx, 0x10    ; 0x10
    mov edx, byte ptr[esi:ecx]    ; 0xb9, inpstr, 0x10
    add eax, edx

    ;; shift again and do the same for 18th byte
    mov ecx, 0x8    ; 0x8
    shl eax, ecx    ; 0x3b900, 0x8
    mov ecx, 0x11    ; 0x11
    mov edx, byte ptr[esi:ecx]    ; 0x2, inpstr, 0x11
    add eax, edx

    ;; for 19th
    mov ecx, 0x8    ; 0x8
    shl eax, ecx    ; 0x3b90200, 0x8
    mov ecx, 0x12    ; 0x12
    mov edx, byte ptr[esi:ecx]    ; 0x4, inpstr, 0x12
    add eax, edx

    ;; get specialValue in edx
    mov ecx, 0x0    ; 0x0
    mov edx, dword ptr [esp:ecx]    ; specialValue, 0x0, 0x0
    xor eax, edx

    ;; get hDlg in edx
    mov ecx, 0x4    ; 0x4
    mov edx, dword ptr [esp:ecx]    ; hDlg, 0x0, 0x4

    ;; second parameter edx = hDlg
    ;; first parameter eax = xorred value
    push edx
    push eax

    ;; get address of xorcmp in eax
    mov ecx, 0x1c    ; 0x1c
    mov eax, dword ptr [esp:ecx]    ; xorcmp, 0x0, 0x1c

    call eax    ; xorcmp
```

This calls `xorcmp` function after xorring last values with `specialValue = 0x4978BBEB` 

![XOR Compare](/images/evpcm-xorcmp.png)

![GetWindowTextA](/images/windoc-get-window-texta.png)

This will take first four bytes from the window (`hDlg`) title and xor it with xorred value and check it with the value on RHS. We know the title of the window :

![The Password Prompt](/images/evpcm-passwd-window.png)

After doing all maths we get the complete password to be : **`gAISzUSwJl4i6BITLOp8`**

![Solved!](/images/evpcm-solved.png)

This is awesome, now we can click Ok and get the flag from the Credit’s screen. 

## Alternative Ideas & Ending Note

I now however wonder if it’s possible to get the flag directly without reversing all this. From the `success` function we know that it’ll load some resource and create a new `Credits.exe` file and then run it to display the flag. All this must be present in the binary. I wonder if there is a way to get this directly. Notice the call to `FindResourceA`. I however I’m not going to touch this chall for a while now but this is a very good crackme and this is the third crackme from [crackmes.one](http://crackmes.one/user/misra.cxx) that I really loved!
