---
author: "Siddharth Mishra"
title: "A C Of Polymorphism Without CPP"
date: "2026-03-25"
description: "Polymorphism in C using real codebases"
tags: ["c", "polymorphism", "gobject", "glib", "gtk", "linux"]
---

# Introduction

Polymorphism sounds like a C++ word. In C, it still exists, just without the sugar. You create a
base type, keep a table of function pointers, and pass that base pointer around.

# A Small Example

Here’s an example. This is the base class.

```c
typedef struct Animal Animal;

struct Animal {
    char* name;
    void (*speak)(Animal* self);
};
```

Now the child types.

```c
typedef struct {
    Animal base;
} Dog;

typedef struct {
    Animal base;
} Cat;
```

The polymorphic functions live in the child types. There is no default `animal_speak()`, so this
behaves like a pure virtual method.

```c
static void dog_speak(Animal* self) {
    printf("%s: woof\n", self->name);
}

static void cat_speak(Animal* self) {
    printf("%s: meow\n", self->name);
}
```

We also have a common destructor in the parent that both child types “inherit”.

```c
static void animal_free(Animal* self) {
    if (!self) {
        return;
    }
    free(self->name);
    memset(self, 0, sizeof(*self));
}
```

Creation ties everything together.

```c
static Dog dog_new(const char* name) {
    Dog dog = {0};
    dog.base.name = strdup(name);
    dog.base.speak = dog_speak;
    return dog;
}

static Cat cat_new(const char* name) {
    Cat cat = {0};
    cat.base.name = strdup(name);
    cat.base.speak = cat_speak;
    return cat;
}
```

Finally, this is how the whole setup is used.

```c
int main(void) {
    Dog rex = dog_new("rex");
    Cat luna = cat_new("luna");

    Animal* pets[] = { (Animal*)&rex, (Animal*)&luna };
    for (size_t i = 0; i < 2; i++) {
        pets[i]->speak(pets[i]);
    }

    animal_free((Animal*)&rex);
    animal_free((Animal*)&luna);
}
```

The base struct stores the function pointer. The derived struct just fills it in. In `main`, both
`Dog` and `Cat` go through the same `speak()` call. That’s the “overloading” point in C: one call
site, multiple implementations.

# However!

Multiple inheritance is tricky in C. You can embed multiple base structs, but then casting gets
dangerous and you need to manage offsets yourself. That’s why GLib/GTK keep a single parent and use
interfaces when they need to mix behavior.

# Real World Use

GTK: [`GtkButton`](https://gitlab.gnome.org/GNOME/gtk/-/blob/ce6dc1b0ebe79d4c184bdfba2582699f2ea2fee5/gtk/gtkbutton.h#L47) is a [`GtkWidget`](https://gitlab.gnome.org/GNOME/gtk/-/blob/ce6dc1b0ebe79d4c184bdfba2582699f2ea2fee5/gtk/gtkwidget.h#L105). The instance struct embeds `GtkWidget` and the class struct
[`GtkButtonClass`](https://gitlab.gnome.org/GNOME/gtk/-/blob/ce6dc1b0ebe79d4c184bdfba2582699f2ea2fee5/gtk/gtkbutton.h#L61) stores function pointers like `clicked` and `activate`. That’s polymorphism as a widget hierarchy.

GLib: [`GMemoryMonitor`](https://gitlab.gnome.org/GNOME/glib/-/blob/9fdb726ea07e85c08e613233f1077065c20d48a8/gio/gmemorymonitor.h#L44) is an interface (vtable), [`GMemoryMonitorBase`](https://gitlab.gnome.org/GNOME/glib/-/blob/9fdb726ea07e85c08e613233f1077065c20d48a8/gio/gmemorymonitorbase.h#L30) is the abstract parent, and
[`GMemoryMonitorPoll`](https://gitlab.gnome.org/GNOME/glib/-/blob/9fdb726ea07e85c08e613233f1077065c20d48a8/gio/gmemorymonitorpoll.h#L31) / [`GMemoryMonitorPsi`](https://gitlab.gnome.org/GNOME/glib/-/blob/9fdb726ea07e85c08e613233f1077065c20d48a8/gio/gmemorymonitorpsi.h#L31) are concrete children. The default implementation is
picked at runtime via [`g_memory_monitor_dup_default()`](https://gitlab.gnome.org/GNOME/glib/-/blob/9fdb726ea07e85c08e613233f1077065c20d48a8/gio/gmemorymonitor.c#L119).

Linux kernel: [`struct file_operations`](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/include/linux/fs.h?h=v6.19.9#n1918) is the vtable. Each filesystem or driver fills in the
function pointers it supports, and the VFS calls through those pointers.
