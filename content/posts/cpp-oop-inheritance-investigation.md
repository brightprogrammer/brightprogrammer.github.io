---
author: "Siddharth Mishra"
title: "Investigating Object Inheritance In Compiled C++ Code"
date: "2025-09-08"
description: "I used to like C++ and then I had to decompile it"
tags: [ "c++", "cpp", "msvc", "gcc", "clang", "compiler", "decompiler", "internals", "inheritance", "oops", "inheritance", ]
draft: true
---

# Without Inheritance

## No Virtual Member

Now just with a class with a `private` large field, a `public` member function and no virtual members.

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        void what();
};

NOINL void Exception::what() {
    puts("Exception::what");
}

int main(int argc, char** argv) {
    Exception e;

    e.what();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::what"
Exception::what():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
main:
        sub     rsp, 24
        lea     rdi, [rsp+15]
        call    Exception::what()
        xor     eax, eax
        add     rsp, 24
        ret
```

{{< notice type="info" >}}
__Observation__
- No virtual table created.
{{< /notice >}}

## Just One Virtual Member

Now just with a class with a `private` large field, a `public` member function and a `public` virtual member function

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        void what();
        virtual void detailed_message();
};

NOINL void Exception::what() {
    puts("Exception::what");
}

NOINL void Exception::detailed_message() {
    puts("Exception::detailed_message");
}

int main(int argc, char** argv) {
    Exception e;

    e.what();
    e.detailed_message();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::what"
Exception::what():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts
main:
        sub     rsp, 24
        lea     rdi, [rsp+8] ;; this (pointer to Exception e)
        call    Exception::what()
        lea     rdi, [rsp+8] ;; this
        call    Exception::detailed_message()
        xor     eax, eax
        add     rsp, 24
        ret
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::detailed_message()
```

{{< notice type="info" >}}
__Observations__
- A virtual table is created even when there's no child class inheriting from this one.
- Calling functions does not initialize or change virtual table anywhere in this case.
- Virtual tables are stored pre-initialized, ready for the [program loader](https://en.wikipedia.org/wiki/Loader_(computing)) to resolve linkages and start execution.
- [`RTTI`](https://en.wikipedia.org/wiki/Run-time_type_information) for `Exception` is stored just before function pointer to very first virtual function.
- The very first entry in virtual table is 0
- To get pointer to the very first virtual function in virtual table, `16` bytes is added to the pointer to virtual function table.
- `typeinfo` struct contains a pointer to first virtual function pointer in vtable of `__cxxabiv1::__class_type_info`.
{{< /notice >}}

{{< notice type="info" >}}
__Questions__
- Is the first virtual table entry for destructor?
- Does the order in which virtual function pointers are stored in virtual table change with the order in which they're defined?
- What is `__cxxabiv1::__class_type_info`?
{{< /notice >}}

Thanks to decompiler explorer, these names are demangled for us automatically, otherwise reading this would've been a bit difficult.

## Two Virtual Members


```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        void what();
        virtual void detailed_message();
        virtual void open_doc();
};

NOINL void Exception::what() {
    puts("Exception::what");
}

NOINL void Exception::detailed_message() {
    puts("Exception::detailed_message");
}

NOINL void Exception::open_doc() {
    puts("Exception::open_doc");
}

int main(int argc, char** argv) {
    Exception e;

    e.what();
    e.detailed_message();
    e.open_doc();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts
.LC2:
        .string "Exception::what"
Exception::what():
        mov     edi, OFFSET FLAT:.LC2
        jmp     puts
main:
        sub     rsp, 24
        lea     rdi, [rsp+8]
        call    Exception::what()
        lea     rdi, [rsp+8]
        call    Exception::detailed_message()
        lea     rdi, [rsp+8]
        call    Exception::open_doc()
        xor     eax, eax
        add     rsp, 24
        ret
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- Pointer to the second virtual function was just appended in the order in which these functions are declared. 
- After playing with this code, I notice that the order of virtual functions in vtable is same as the order in which they're declared inside the class.
{{< /notice >}}

## All Virtual Functions Private

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        void what(){
            detailed_message();
            open_doc();
        }
    
    private:
        NOINL virtual void detailed_message() {
            puts("Exception::detailed_message");
        }

        NOINL virtual void open_doc() {
            puts("Exception::open_doc");
        }
};

int main(int argc, char** argv) {
    Exception e;

    e.what();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts
main:
        sub     rsp, 24
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for Exception+16
        lea     rdi, [rsp+8]
        call    Exception::detailed_message()
        lea     rdi, [rsp+8]
        call    Exception::open_doc()
        xor     eax, eax
        add     rsp, 24
        ret
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- VTable created like regular.
{{< /notice >}}

## With Destructor

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        NOINL void what(){
            detailed_message();
            open_doc();
        }

        NOINL ~Exception() {
            puts("Exception::~Exception");
        }
    
        NOINL virtual void detailed_message() {
            puts("Exception::detailed_message");
        }

        NOINL virtual void open_doc() {
            puts("Exception::open_doc");
        }
};

int main(int argc, char** argv) {
    Exception e;

    e.what();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts

;; The assumption that rdi is related to some function pointer comes from me
;; reading main() first and seeing what's passed to it
Exception::what():
        sub     rsp, 24
        ;; [rdi] means deref (pointer to (pointer to (function pointer)))
        ;; rax now contains (pointer to (function pointer))
        mov     rax, QWORD PTR [rdi]
        
        ;; v8 = (pointer to (pointer to (function pointer)))
        mov     QWORD PTR [rsp+8], rdi

        ;; rax = deref (pointer to (function pointer))
        ;; or rax = (function pointer)
        mov     rax, QWORD PTR [rax]

        ;; check if rax(function pointer) same as (function pointer) to detailed message
        ;; if rax does not contain (function) pointer to Exception::detailed_message
        ;; then call whatever's there in L5
        cmp     rax, OFFSET FLAT:Exception::detailed_message()
        jne     .L5 <<----------------------------------------------------------------------------------\
                                                                                                        |
        ;; if it is the Exception::detailed_message pointer then call it                                |
        call    Exception::detailed_message()                                                           |
                                                                                                        |
        ;; Get (function pointer) of Exception::open_doc by offsetting pointer by 8                     |
        ;; in a way similar to how we got (function pointer) for Exception::detailed_message            |
        mov     rdi, QWORD PTR [rsp+8]                                                                  |
        mov     rax, QWORD PTR [rdi]                                                                    |
        mov     rax, QWORD PTR [rax+8]                                                                  |
                                                                                                        |
        ;; If retrieved (function pointer) is not Exception::open_doc                                   |
        ;; then just call whatever's in there in L7                                                     |
        cmp     rax, OFFSET FLAT:Exception::open_doc()                                                  | 
        jne     .L7 <<----------------------------------------------------------------------------\     |
                                                                                                  |     |
        ;; if it is Exception::open_doc then restore stack and jump (why not making a call?)      |     |
.L9:                                                                                              |     |
        add     rsp, 24                                                                           |     |
        jmp     Exception::open_doc()                                                             |     |    
                                                                                                  |     |
        ;; coming from here ----------------------------------------------------------------------|-----/
.L5:                                                                                              |
        call    rax                                                                               |
        mov     rdi, QWORD PTR [rsp+8]                                                            |
        mov     rax, QWORD PTR [rdi]                                                              |
        mov     rax, QWORD PTR [rax+8]                                                            |
        cmp     rax, OFFSET FLAT:Exception::open_doc()                                            |
        je      .L9                                                                               |
                                                                                                  |
        ;; coming from here ----------------------------------------------------------------------/
.L7:
        add     rsp, 24
        jmp     rax

.LC2:
        .string "Exception::~Exception"
Exception::~Exception() [base object destructor]:
        sub     rsp, 8
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for Exception+16
        mov     edi, OFFSET FLAT:.LC2
        call    puts
        add     rsp, 8
        ret

        ;; create an alias for base object destructor and call it complete object destructor
        .set    Exception::~Exception() [complete object destructor],Exception::~Exception() [base object destructor]

main:
        push    rbx
        sub     rsp, 16

        ;; v8 = (pointer to (function pointer Exception::detailed_message))
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for Exception+16

        ;; Exception::what(&v8)
        ;; or Exception::what((pointer to (pointer to (function pointer Exception::detailed message))))
        lea     rdi, [rsp+8]
        call    Exception::what()

        ;; Exception::~Exception(&v8)
        ;; or Exception::~Exception((pointer to (pointer to (function pointer Exception::detailed_message))))
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]

        ;; restore stack, return 0
        add     rsp, 16
        xor     eax, eax
        pop     rbx
        ret

        mov     rbx, rax
        jmp     .L13

;; no one seems to be coming here
main.cold:
.L13:
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, rbx
        call    _Unwind_Resume

;; standard type information and vtables
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- Code suddenly became a bit more complex just with the presence of a non-virtual destructor
- I see some random checks in `Exception::what()` what seem redundant. It's checking if pointer in vtable is same as pointer it's guessing
  and even if it's not, it's calling it anyways.
- Vtable layout remains same.
{{< /notice >}}

{{< notice type="info" >}}
__Questions__
- Are those checks to see if function pointer is same as expected, really required? Are these checks present always?
{{< /notice >}}

## Virtual Destructor

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        NOINL void what(){
            detailed_message();
            open_doc();
        }

        NOINL virtual ~Exception() {
            puts("Exception::~Exception");
        }
    
        NOINL virtual void detailed_message() {
            puts("Exception::detailed_message");
        }

        NOINL virtual void open_doc() {
            puts("Exception::open_doc");
        }
};

int main(int argc, char** argv) {
    Exception e;

    e.what();
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts
.LC2:
        .string "Exception::~Exception"

Exception::~Exception() [base object destructor]:
        sub     rsp, 8
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for Exception+16
        mov     edi, OFFSET FLAT:.LC2
        call    puts
        add     rsp, 8
        ret
        .set    Exception::~Exception() [complete object destructor],Exception::~Exception() [base object destructor]
        
Exception::~Exception() [deleting destructor]:
        sub     rsp, 24
        mov     QWORD PTR [rsp+8], rdi
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, QWORD PTR [rsp+8]
        mov     esi, 8
        add     rsp, 24
        jmp     operator delete(void*, unsigned long)

Exception::what():
        sub     rsp, 24
        mov     rax, QWORD PTR [rdi]
        mov     QWORD PTR [rsp+8], rdi
        mov     rax, QWORD PTR [rax+16]
        cmp     rax, OFFSET FLAT:Exception::detailed_message()
        jne     .L9
        call    Exception::detailed_message()
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        jne     .L11
.L13:
        add     rsp, 24
        jmp     Exception::open_doc()
.L9:
        call    rax
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        je      .L13
.L11:
        add     rsp, 24
        jmp     rax
        
main:
        ;; setup stack
        push    rbx
        sub     rsp, 16

        ;; var8 = (pointer to (function pointer Exception::~Exception [complete object destructor]))
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for Exception+16
        
        ;; rdi = &var8
        ;; or rdi = (pointer to (pointer to (function pointer Exception::~Exception [complete object destructor])))
        ;; Exception::what(&var8)
        lea     rdi, [rsp+8]
        call    Exception::what()

        ;; Exception::~Exception() [complete object destructor]
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]

        ;; restore stack and exit
        add     rsp, 16
        xor     eax, eax
        pop     rbx
        ret
        
        mov     rbx, rax
        jmp     .L15
main.cold:
.L15:
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, rbx
        call    _Unwind_Resume
        
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::~Exception() [complete object destructor] ;; new here
        .quad   Exception::~Exception() [deleting destructor]        ;; new here
        .quad   Exception::detailed_message()                        ;; moved down
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- `Exception::open_doc` and `Exception::detailed_message` remained same as expected
- A new destructor `deleting destructor`
- `complete object destructor` is an alias of `base object destructor`.
- `base object destructor` is the actual destructor code we wrote.
- `deleting destructor` code is defined but never called.
- Code for `Exception::what` is exacly like without virtual destructor, except that it adjusts for function pointers to find
  the first virtual function (not destructor).
- `deleting destructor` and `complete object destructor` are set as first two virtual functions in vtable.
- Functions that used to be first are shifted down the vtable with presence of a single virtual destructor.
{{< /notice >}}

## Virtual Destructor With `new` and `delete`

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        NOINL void what(){
            detailed_message();
            open_doc();
        }

        NOINL virtual ~Exception() {
            puts("Exception::~Exception");
        }
    
        NOINL virtual void detailed_message() {
            puts("Exception::detailed_message");
        }

        NOINL virtual void open_doc() {
            puts("Exception::open_doc");
        }
};

int main(int argc, char** argv) {
    Exception e;
    e.what();

    Exception* m = new Exception;
    m->what();
    delete m;
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts
.LC2:
        .string "Exception::~Exception"
Exception::~Exception() [base object destructor]:
        sub     rsp, 8
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for Exception+16
        mov     edi, OFFSET FLAT:.LC2
        call    puts
        add     rsp, 8
        ret
        .set    Exception::~Exception() [complete object destructor],Exception::~Exception() [base object destructor]
Exception::~Exception() [deleting destructor]:
        sub     rsp, 24
        mov     QWORD PTR [rsp+8], rdi
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, QWORD PTR [rsp+8]
        mov     esi, 8
        add     rsp, 24
        jmp     operator delete(void*, unsigned long)
Exception::what():
        sub     rsp, 24
        mov     rax, QWORD PTR [rdi]
        mov     QWORD PTR [rsp+8], rdi
        mov     rax, QWORD PTR [rax+16]
        cmp     rax, OFFSET FLAT:Exception::detailed_message()
        jne     .L9
        call    Exception::detailed_message()
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        jne     .L11
.L13:
        add     rsp, 24
        jmp     Exception::open_doc()
.L9:
        call    rax
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        je      .L13
.L11:
        add     rsp, 24
        jmp     rax
        
main:
        push    rbx
        sub     rsp, 16
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for Exception+16
        lea     rdi, [rsp+8]
        call    Exception::what()
        mov     edi, 8

        ;; m = new(Exception)
        ;; (uint64_t*)m[0] = (pointer to (function pointer Exception::~Exception [complete object destructor]))
        call    operator new(unsigned long)
        mov     QWORD PTR [rax], OFFSET FLAT:vtable for Exception+16

        ;; Exception::what(m)
        mov     rdi, rax
        mov     rbx, rax
        call    Exception::what()

        mov     rax, QWORD PTR [rbx]
        mov     rdi, rbx
        call    [QWORD PTR [rax+8]] ;; indirect call to Exception::~Exception() [deleting destructor]
        
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]

        add     rsp, 16
        xor     eax, eax
        pop     rbx
        ret
        mov     rbx, rax
        jmp     .L15
main.cold:
.L15:
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, rbx
        call    _Unwind_Resume
        
typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::~Exception() [complete object destructor]
        .quad   Exception::~Exception() [deleting destructor]
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- `Deleting destructor` was defined and present, but wasn't used until unless we actuall use `delete` in our code.
- Calling `delete` on a class with virtual destructor ends up calling `deleting destructor` of that class.
- Making the same destructor non-virtual results in a direct call to `delete` instead of through a destructor
  |![](/images/cpp-non-virtual-destructor-calls-delete.png)                   |
  |---------------------------------------------------------------------------|
  | image of assembly output when non-virtual destructor is used for same code|
{{< /notice >}}

# First Level of Inheritance

## No Member Functions At All

```cpp
#include <stdio.h>

#define NOINL __attribute__((noinline))

class Exception {
    public:
        NOINL void what(){
            detailed_message();
            open_doc();
        }

        NOINL virtual ~Exception() {
            puts("Exception::~Exception");
        }
    
        NOINL virtual void detailed_message() {
            puts("Exception::detailed_message");
        }

        NOINL virtual void open_doc() {
            puts("Exception::open_doc");
        }
};

class DivByZero : public Exception {

};

int main(int argc, char** argv) {
    DivByZero dbz;
    dbz.what();

    DivByZero *pdbz = new DivByZero;
    pdbz->what();
    delete pdbz;
}
```

```asm
;; compiled assembly
;; x86-64 gcc 15.2
;; compile flags: -O2
.LC0:
        .string "Exception::open_doc"
Exception::open_doc():
        mov     edi, OFFSET FLAT:.LC0
        jmp     puts
.LC1:
        .string "Exception::detailed_message"
Exception::detailed_message():
        mov     edi, OFFSET FLAT:.LC1
        jmp     puts

;; Exception class [base object destructor] and [deleting destructor]
.LC2:
        .string "Exception::~Exception"
Exception::~Exception() [base object destructor]:
        sub     rsp, 8
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for Exception+16
        mov     edi, OFFSET FLAT:.LC2
        call    puts
        add     rsp, 8
        ret
        .set    Exception::~Exception() [complete object destructor],Exception::~Exception() [base object destructor]
Exception::~Exception() [deleting destructor]:
        sub     rsp, 24
        mov     QWORD PTR [rsp+8], rdi
        call    Exception::~Exception() [complete object destructor]
        mov     rdi, QWORD PTR [rsp+8]
        mov     esi, 8
        add     rsp, 24
        jmp     operator delete(void*, unsigned long)

;; DivByZero class [base object destructor] and [deleting destructor]
DivByZero::~DivByZero() [base object destructor]:
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for DivByZero+16
        jmp     Exception::~Exception() [base object destructor]
        .set    DivByZero::~DivByZero() [complete object destructor],DivByZero::~DivByZero() [base object destructor]
DivByZero::~DivByZero() [deleting destructor]:
        sub     rsp, 24
        mov     QWORD PTR [rdi], OFFSET FLAT:vtable for DivByZero+16
        mov     QWORD PTR [rsp+8], rdi
        call    Exception::~Exception() [base object destructor]
        mov     rdi, QWORD PTR [rsp+8]
        mov     esi, 8
        add     rsp, 24
        jmp     operator delete(void*, unsigned long)

;; Same behavior as before, just with slightly changed offsets into vtable        
Exception::what():
        sub     rsp, 24
        mov     rax, QWORD PTR [rdi]
        mov     QWORD PTR [rsp+8], rdi
        mov     rax, QWORD PTR [rax+16]
        cmp     rax, OFFSET FLAT:Exception::detailed_message()
        jne     .L12
        call    Exception::detailed_message()
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        jne     .L14
.L16:
        add     rsp, 24
        jmp     Exception::open_doc()
.L12:
        call    rax
        mov     rdi, QWORD PTR [rsp+8]
        mov     rax, QWORD PTR [rdi]
        mov     rax, QWORD PTR [rax+24]
        cmp     rax, OFFSET FLAT:Exception::open_doc()
        je      .L16
.L14:
        add     rsp, 24
        jmp     rax


main:
        push    rbx
        sub     rsp, 16
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for DivByZero+16
        lea     rdi, [rsp+8]
        call    Exception::what()

        mov     edi, 8
        call    operator new(unsigned long)
        mov     QWORD PTR [rax], OFFSET FLAT:vtable for DivByZero+16
        mov     rdi, rax
        mov     rbx, rax
        call    Exception::what()
        mov     rax, QWORD PTR [rbx]
        mov     rdi, rbx
        call    [QWORD PTR [rax+8]] ;; indrectly calling [deleting destructor] for DivByZero

        ;; object on stack deinited by calling destructor for Exception
        lea     rdi, [rsp+8]
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for DivByZero+16 ;; overwriting vtable pointer
        call    Exception::~Exception() [base object destructor]

        add     rsp, 16
        xor     eax, eax
        pop     rbx
        ret
        mov     rbx, rax
        jmp     .L18

main.cold:
.L18:
        mov     QWORD PTR [rsp+8], OFFSET FLAT:vtable for DivByZero+16
        lea     rdi, [rsp+8]
        call    Exception::~Exception() [base object destructor]
        mov     rdi, rbx
        call    _Unwind_Resume

typeinfo name for Exception:
        .string "9Exception"
typeinfo for Exception:
        .quad   vtable for __cxxabiv1::__class_type_info+16
        .quad   typeinfo name for Exception

typeinfo name for DivByZero:
        .string "9DivByZero"
typeinfo for DivByZero:
        .quad   vtable for __cxxabiv1::__si_class_type_info+16
        .quad   typeinfo name for DivByZero
        .quad   typeinfo for Exception
        
vtable for Exception:
        .quad   0
        .quad   typeinfo for Exception
        .quad   Exception::~Exception() [complete object destructor]
        .quad   Exception::~Exception() [deleting destructor]
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()

vtable for DivByZero:
        .quad   0
        .quad   typeinfo for DivByZero
        .quad   DivByZero::~DivByZero() [complete object destructor]
        .quad   DivByZero::~DivByZero() [deleting destructor]
        .quad   Exception::detailed_message()
        .quad   Exception::open_doc()
```

{{< notice type="info" >}}
__Observations__
- New vtable for `DivByZero` class.
- New destructors for `DivByZero`.
- `DivByZero::~DivByZero [base object destructor]` calls `Exception::~Exception [base object destructor]`
- `DivByZero::~DivByZero [deleting destructor]` also calls `Exception::~Exception [base object destructor]`
- Before calling destructor to object on stack, vtable of child class is overwritten with it's own vtable, but destructor of parent class is called.
{{< /notice >}}
