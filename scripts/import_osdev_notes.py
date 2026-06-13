#!/usr/bin/env python3
"""One-off: import MisraOS osdev notes (mdBook) as Hugo page bundles.

Converts `| ![](/res/osdev/x.png) | ... | caption |` image tables into
`{{< img >}}` shortcodes, lifts the title/date header into front matter,
strips the mdBook social/utterances footer, and copies only the images
each post references into its bundle.
"""
import os
import re
import shutil

SRC_DIR = "/home/hacker/Desktop/OldFiles/drive-download-20260613T143946Z-3-001/notes/src/osdev"
IMG_SRC = "/home/hacker/Desktop/OldFiles/drive-download-20260613T143946Z-3-001/notes/src/res/osdev"
DST_DIR = "/home/hacker/Desktop/brightprogrammer.github.io/content/posts"
AUTHOR = "Siddharth Mishra"

POSTS = {
    "system-boot": {
        "title": "System Boot",
        "date": "2022-01-08",
        "description": "What Actually Happens When A System Boots Up",
        "tags": ["osdev", "misraos", "kernel", "x86_64", "boot"],
    },
    "project-initialisation": {
        "title": "Project Initialisation",
        "date": "2022-01-08",
        "description": "Setting Up The MisraOS Kernel With Limine & stivale2",
        "tags": ["osdev", "misraos", "kernel", "c", "cmake", "limine"],
    },
    "creating-our-own-puts": {
        "title": "Creating Our Own 'puts'",
        "date": "2022-01-09",
        "description": "Drawing Bitmap Fonts To The Framebuffer For A Debug Print",
        "tags": ["osdev", "misraos", "kernel", "c", "framebuffer"],
    },
    "implementing-descriptor-tables": {
        "title": "Implementing Descriptor Tables",
        "date": "2022-01-10",
        "description": "GDT, LDT & IDT Straight From The AMD64 Manual",
        "tags": ["osdev", "misraos", "kernel", "x86_64", "gdt", "idt"],
    },
}

IMG_RE = re.compile(r"!\[\]\((?:/res/osdev/)([^)]+)\)")


def esc(s: str) -> str:
    # shortcode params are double-quoted; collapse internal quotes
    return s.replace('"', "'").strip()


def convert_table(block_lines):
    """block_lines: consecutive lines that all start with '|'. Returns the
    replacement text (shortcodes) if it's an image table, else the block
    unchanged."""
    imgs = []
    captions = []
    for ln in block_lines:
        m = IMG_RE.search(ln)
        if m:
            imgs.append(m.group(1))
            continue
        if re.match(r"^\|\s*:?-+:?\s*\|", ln):  # separator row
            continue
        # caption row: strip leading/trailing pipes
        cell = ln.strip().strip("|").strip()
        if cell:
            captions.append(cell)
    if not imgs:
        return "\n".join(block_lines)  # not an image table; leave alone
    caption = " — ".join(captions)
    out = []
    for i, img in enumerate(imgs):
        # attach caption to the last image of the block
        cap = caption if i == len(imgs) - 1 else ""
        alt = cap if cap else os.path.splitext(img)[0]
        if cap:
            out.append(
                f'{{{{< img src="{img}" alt="{esc(alt)}" '
                f'caption="{esc(cap)}" title="{esc(cap)}" >}}}}'
            )
        else:
            out.append(f'{{{{< img src="{img}" alt="{esc(alt)}" >}}}}')
    return "\n".join(out)


def process(text):
    lines = text.splitlines()

    # drop the `# Title` (line 0) and `###### date | author` (line 1) header
    while lines and not lines[0].startswith("# "):
        lines.pop(0)
    if lines and lines[0].startswith("# "):
        lines.pop(0)
    if lines and lines[0].startswith("###### "):
        lines.pop(0)

    # strip the trailing mdBook social <div> + utterances <script> footer
    body = "\n".join(lines)
    body = re.sub(
        r'<div class="flex-center".*', "", body, flags=re.DOTALL
    )
    body = body.rstrip()

    # walk lines, converting contiguous pipe-table blocks
    out_lines = []
    buf = []
    used_imgs = []
    for ln in body.splitlines():
        if ln.lstrip().startswith("|"):
            buf.append(ln)
            continue
        if buf:
            for b in buf:
                m = IMG_RE.search(b)
                if m:
                    used_imgs.append(m.group(1))
            out_lines.append(convert_table(buf))
            buf = []
        out_lines.append(ln)
    if buf:
        for b in buf:
            m = IMG_RE.search(b)
            if m:
                used_imgs.append(m.group(1))
        out_lines.append(convert_table(buf))

    return "\n".join(out_lines).strip() + "\n", used_imgs


def main():
    for slug, meta in POSTS.items():
        src = os.path.join(SRC_DIR, slug + ".md")
        with open(src) as f:
            raw = f.read()
        body, imgs = process(raw)

        tags = ",\n  ".join(f'"{t}"' for t in meta["tags"])
        fm = (
            "---\n"
            f'author: "{AUTHOR}"\n'
            f'title: "{meta["title"]}"\n'
            f'date: "{meta["date"]}"\n'
            f'description: "{meta["description"]}"\n'
            "draft: false\n"
            "tags:\n  [\n  " + tags + "\n  ]\n"
            "---\n\n"
        )

        bundle = os.path.join(DST_DIR, slug)
        os.makedirs(bundle, exist_ok=True)
        with open(os.path.join(bundle, "index.md"), "w") as f:
            f.write(fm + body)

        for img in sorted(set(imgs)):
            shutil.copy2(os.path.join(IMG_SRC, img), os.path.join(bundle, img))

        print(f"{slug}: {len(set(imgs))} images -> {bundle}")


if __name__ == "__main__":
    main()
