---
author: "Siddharth Mishra"
title: "How I Do Error Handling in C"
date: "2024-12-13"
description: "Something I figured out while writing and looking at lots of C code"
tags: ["c", "error-handling", "programming"]
---

This is not actually supposed to be a post because I think everyone has their own way of doing
things. This post I'm writing is just to overcome the FOMO of not writing enough blog posts, but
owning a domain and constantly keeping up my Pi4 to host this static website. Also because good
software engineers recommend making a habit of writing a blog post regularly.

# The Problem

You're writing lots of functions in your program and it's possible for those functions to fail
and you want to know when they fail. Say you're creating a `Vector` implementation in C and
you want to know whether the `VectorPushBack` method you wrote will fail or succeed in inserting
element.

```c
typedef struct {
    void* data;
    size_t item_size;
    size_t length;
    size_t capacity;
} Vector;
```

The main objective of this post is to help you quickly decide how the function signatures will
look like for interacting with this vector object and how those functions will do error checking
given what the decided function signature is. I'm assuming here that you're in a habit of
checking function return values on failure or success before writing any further logic. Even
standard functions like `fopen()`, `strdup()`, `malloc()` can fail in certain cases.

## Possible Solutions

- `bool VectorPushBack(Vector* vec, void* data)` : Return `true` or `false` depending on success or fail.
- `Vector VectorPushBack(Vector vec, void* data)` : Don't care about success or failure, just return the `vec` after insertion.
- `Vector* VectorPushBack(Vector* vec, void* data)` : Return `vec` (a `Vector` object, i.e. `Vector*`) if success, otherwise `NULL`.
- `size_t VectorPushBack(Vector* vec, void* data)` : Return length of vector after insertion.

Here `void* data` is the pointer to data to be inserted. Note that we already know the size
of item to be inserted here so we can easily do a `memcpy()` over it. There may be other possible
function signatures as well depending on how you're using this object, but I've mostly seen these.
Also, one must note that there is no good or bad implementation/solution here because this post is
assuming lots of things, I'm just considering the most general cases.

## What I Use?

I personally prefer using the third solution with something like this :

```c
#ifndef NDEBUG
#    define LOG_ERROR(...) fprintf(stderr, __VA_ARGS__);
#else
#    define LOG_ERROR(...)
#endif

Vector* VectorPushBack(Vector* vec, void* data) {
    if(!vec || !data) {
        LOG_ERROR("invalid arguments.");
        return NULL;
    }

    // resize vector if required
    // perform insertion operation
    // do error checking and return NULL if insertion fails

    // return the vector itself on success
    return vec;
}
```

And now all my other `Vector` functions as well have this signature. For whatever object the function
is defined, pointer to that object will be returned. All function's first argument will be a pointer
to the same object type and then from second argument we take the actual parameters.

So, now if I were to extend this implementation to automatically create copy of data instead
of doing a direct `memcpy` for it, because the data can sometimes be another object that contains
pointer, say something like a `Vector<Vector>`, a vector of vectors. In these cases, instead of
doing a `memcpy` blindly, I personally prefer calling a `CopyConstructor` and `CopyDestructor`
method to create and destroy copies of object to be inserted and deleted.

So, now the implementation will extend to something like

```c
typedef void* (*GenericCopyInit)(void* dst, void* src);
typedef void* (*GenerciCopyDeinit)(void* copy);

typedef struct {
    void* data;
    size_t item_size;
    size_t length;
    size_t capacity;

    GenericCopyInit copy_init;
    GenerciCopyDeinit copy_deinit;
} Vector;

Vector* VectorCreate(GenericCopyInit copy_init, GenerciCopyDeinit copy_deinit, size_t item_size);

Vector* VectorPushBack(Vector* vec, void* data) {
    if(!vec || !data) {
        LOG_ERROR("invalid arguments.");
        return NULL;
    }

    // resize vector if required

    // perform insertion operation
    if(vec->copy_init) {
        // since copy_init will be unique for a specific type, it already knows the size
        // of pointers it's receiving
        if(!vec->copy_init(vec->data + (vec->length * vec->item_size), data)) {
            LOG_ERROR("copy init failed.");
            return NULL;
        }
    } else {
        memcpy(vec->data + (vec->length * vec->item_size), data, item_size);
    }

    // do error checking and return NULL if insertion fails

    // return the vector itself on success
    return vec;
}
```

## Usage

Now this will allow you to do crazy things like :

```c
Vector* v = NULL;
if(!VectorPushBack((v = VectorCreate(NULL, NULL, sizeof(int))), ((int[]){1}))) {
    LOG_ERROR("failed to insert important data to vector.");
    if(v) {
        VectorDestroy(v);
    }
    return NULL;
}

```

Not that this code is going to be any faster or slower, or it looks better in any way,
just that this is possible and you can chain multiple calls together when needed.

## The Result

One really good consequence of doing it like this is the errors generated quickly give you
a timeline of what happened before things really went down. So let's say the the `VectorPushBack`
method fails, then you might get an error like this :

```
string copy failed.
failed to insert item.
failed to add important data to vector.
error occured, exiting...
```

The last line being the latest error message and the first error message being the root-cause
of it all. You can even use some macro magic to give you more information like :

```
CreateStringCopy : string copy failed.
VectorPushBack : failed to insert item.
InsertImportantString : failed to add important data to vector.
main : error occured, exiting...
```

Giving you information about the function where the event took place.

Also, when using `GenericCopyInit` and `GenericCopyDeinit` to create and destroy copies
of objects, I usually define them like this. Assume that we need to create a vector of `String`.

```c
// shortcut
typedef Vector String;

String* StringInitCopy(String* dst, String* src) {
    if(!dst || !src) {
        LOG_ERROR("invalid arguments.");
        return NULL;
    }

    // create copy of data
    dst->data = strndup(src->data, src->length);
    if(!dst->data) {
        // error handling
        return NULL;
    }

    return dst;
}

String* StringDeinitCopy(String* copy) {
    if(!copy) {
        LOG_ERROR("invalid arguments.");
        return NULL;
    }

    free(copy->data);
    memset(copy, 0, sizeof(String));

    return copy;
}
```

This way now we can create a Vector of string like :

```c
Vector* strs = VectorCreate((GenericCopyInit)StringInitCopy, (GenericCopyDeinit)StrignDeinitCopy, sizeof(String));
// error checking
```

And now if init or deinit method fail, the insertion will automatically fail as well rolling back like a
stack trace.

To make this more clean, by sacrificing the readability of implementation code, you can use macros
to make this vector implementation typesafe, but that's a topic for some other post. To get a basic
idea, you can take a look at [rxi's vector implementation](https://github.com/rxi/vec/blob/master/src/vec.c).

# Final Comments

Well, this is all, thats how I've been doing it after getting a liking to it. If you have some
experience with rust, you'll find this is very much similar to how rust handles errors. In
rust you end up doing an `unwrap()` or some other similar call, maybe by using some pattern-matching
but in the end you need to check the return value before using it there as well, and that's what
we're doing here.

The main point is, in C, we do it the C way and not try to imitate some syntactic-sugar other languages
have. In rust, I won't consider it a syntactic-sugar because it's really helpful and useful. Share
how you do it (if it matters to you :wink:) below in the comments.
