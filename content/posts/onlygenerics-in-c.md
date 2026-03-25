---
author: "Siddharth Mishra"
title: "OnlyGenerics In C"
date: "2026-03-25"
description: "Cheap macro tricks for template-like types in C"
tags: ["c", "generics", "macros", "templates", "misrastdc"]
---

# Introduction

C doesn’t have templates, but it does have the preprocessor. If you’re careful, you can get
something that feels like `std::vector<T>` without switching languages. It’s not perfect and it’s
not type theory, but it is surprisingly usable.

This post is about that: cheap macro tricks that give you “templated” types in plain C.

# The Core Trick

You first define a generic backing struct. Then you create a macro that expands to a type‑specific
struct. That macro is your “template”.

```c
typedef struct {
    u64               length;
    u64               capacity;
    GenericCopyInit   copy_init;
    GenericCopyDeinit copy_deinit;
    char             *data;
    u64               alignment;
} GenericVec;

#define Vec(T)                                                                                                         \
    struct {                                                                                                           \
        u64               length;                                                                                      \
        u64               capacity;                                                                                    \
        GenericCopyInit   copy_init;                                                                                   \
        GenericCopyDeinit copy_deinit;                                                                                 \
        T                *data;                                                                                        \
        u64               alignment;                                                                                   \
    }

#define VEC_DATATYPE(v) TYPE_OF((v)->data[0])
```

`GenericVec` is the raw container. `Vec(T)` is the template. It expands to the same layout but with
`T *data`, so you get type‑specific access without casting everywhere. `VEC_DATATYPE` is a helper
that recovers the element type from a typed vector.

# Type Helpers

There is also a small macro for grabbing the type of an expression. It’s simple, but it makes the
rest of the macros possible.

```c
#if defined(__cplusplus)
#    include <type_traits>
#    define TYPE_OF(x) std::remove_reference<decltype((x))>::type
#else
#    define TYPE_OF(x) __typeof__((x))
#endif
```

Now the macros can ask “what type is this vector holding?” and make type‑correct pointer math.

# Type‑Safe Accessors

The actual operations are thin wrappers over the generic implementation. The macros make them feel
typed.

```c
#define VecAlignedOffsetAt(v, idx) ((idx) * ALIGN_UP(sizeof(VEC_DATATYPE(v)), (v)->alignment))

#define VecAt(v, idx) ((VEC_DATATYPE(v) *)(VecAlignedOffsetAt((v), (idx)) + (char *)(v)->data))[0]

#define VecPtrAt(v, idx) ((VEC_DATATYPE(v) *)(VecAlignedOffsetAt((v), (idx)) + (char *)(v)->data))

#define VecLen(v) ((v)->length)
```

This is the key: `VecAt` returns a real `T`, not `void*`. The access is still generic under the
hood, but the surface looks typed.

# Macro Dispatch

The typed API doesn’t reimplement algorithms. It just forwards to a generic core with three bits
of info: the base pointer, the element size, and the raw bytes to work on.

```c
#define GENERIC_VEC(x) ((GenericVec *)(void *)(x))

#define VecReserve(v, n) (reserve_vec(GENERIC_VEC(v), sizeof(VEC_DATATYPE(v)), (n)))

#define VecRemoveRange(v, ptr, start, count)                                                                           \
    do {                                                                                                               \
        if ((ptr) != NULL) {                                                                                           \
            const VEC_DATATYPE(v) __x = *(ptr);                                                                        \
            (void)__x;                                                                                                 \
        }                                                                                                              \
        VEC_DATATYPE(v) *p = (ptr);                                                                                    \
        remove_range_vec(GENERIC_VEC(v), (char *)p, sizeof(VEC_DATATYPE(v)), (start), (count));                        \
    } while (0)

#define VecInsertR(v, rval, idx)                                                                                       \
    do {                                                                                                               \
        ValidateVec(v);                                                                                                \
        VEC_DATATYPE(v) __tmp__val_##__LINE__ = (rval);                                                                \
        insert_range_into_vec(GENERIC_VEC(v), (char *)&__tmp__val_##__LINE__, sizeof(VEC_DATATYPE(v)), (idx), 1);      \
    } while (0)
```

Now look at the generic core. It doesn’t know about `T`, it only knows bytes and sizes.

```c
void reserve_vec(GenericVec *vec, size item_size, size n) {
    ValidateVec(vec);

    if (n > vec->capacity) {
        char *ptr = realloc(vec->data, (n + 1) * vec_aligned_size(vec, item_size));
        if (!ptr) {
            LOG_SYS_FATAL("realloc() failed");
        }
        vec->data = ptr;
        memset(
            ptr + vec_aligned_offset_at(vec, vec->capacity, item_size),
            0,
            vec_aligned_size(vec, item_size) * (n + 1 - vec->capacity)
        );
        vec->capacity = n;
    }
}

void insert_range_into_vec(GenericVec *vec, char *item_data, size item_size, size idx, size count) {
    if (!count) {
        return;
    }

    ValidateVec(vec);

    if (idx > vec->length) {
        LOG_FATAL("vector index out of bounds, insertion at index greater than length");
    }

    if (vec->length + count >= vec->capacity) {
        reserve_pow2_vec(vec, item_size, vec->capacity + count);
    }

    if (idx < vec->length) {
        memmove(
            vec_ptr_at(vec, idx + count, item_size),
            vec_ptr_at(vec, idx, item_size),
            (vec->length - idx) * vec_aligned_size(vec, item_size)
        );
    }

    for (size i = 0; i < count; i++) {
        if (vec->copy_init) {
            memset(vec_ptr_at(vec, idx + i, item_size), 0, item_size);
            vec->copy_init(vec_ptr_at(vec, idx + i, item_size), item_data + i * item_size);
        } else {
            memcpy(vec_ptr_at(vec, idx + i, item_size), item_data + i * item_size, item_size);
        }
    }

    vec->length += count;
    memset(vec_ptr_at(vec, vec->length, item_size), 0, item_size);
}
```

This is the dispatch: the macro layer shapes the call, the generic layer does the work. Helpers
like `vec_ptr_at` and `vec_aligned_size` handle the pointer math so the public API can stay clean.

# Usage

The usage reads like templates because the macro is doing the type expansion for you.

```c
#define VecInit() VecInitAlignedWithDeepCopy(NULL, NULL, 1)
#define VecInitT(v) VecInitAlignedWithDeepCopyT(v, NULL, NULL, 1)
```

You can now write code like this:

```c
typedef Vec(int) IntVec;

typedef struct {
    int x;
    int y;
} Point;

typedef Vec(Point) Points;

IntVec numbers = VecInit();
Points pts = VecInit();
```

No C++ templates, no codegen. Just macros and some discipline.

# Possibilities

One possible direction is to be strict about initialization and cleanup. Types that expose an
`Init()` macro can be treated as “must‑init,” then deinitialized when you’re done. The checks are
cheap, and they can catch a lot of “uninitialized object” bugs early.

Another option is to encode ownership in the macro names. `VecInsertL` is an l‑value insert: if the
vector doesn’t have a `copy_init`, it can take ownership and clear the original with `memset`. That
means the source is no longer safe to use. `VecInsertR` is the “don’t care” path: no ownership
transfer, just insert the bytes. It looks small, but it keeps intent explicit in call sites.

# However!

You are still in C. These are macros, not real generics. You have to be careful with types,
side‑effects, and debugging. But if you keep the surface small and predictable, this is a very
practical way to get “OnlyGenerics” in C.

# References

- [MisraStdC repository](https://github.com/brightprogrammer/MisraStdC)
- [docs.brightprogrammer.in](https://docs.brightprogrammer.in)
