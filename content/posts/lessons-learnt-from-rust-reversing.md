---
author: "Siddharth Mishra"
title: "Lessons Learnt From Reversing Rust In CTF"
date: "2025-10-29"
description: "didn't solve the challenge but learnt something new"
tags: ["ctf", "rust", "reverse-engineering"]
---

{{< notice type="info" >}}
TLDR; just create IDA flirt signatures or something similar in Ghidra (I'm not sure how it works in Ghidra).
{{< /notice >}}

Played `m0lecon` recently, took one single challenge, ended up not solving it. At first I thought why did challenge
creators even bother creating a challenge if they only had to do it in rust? _Everyone sane_ feels absolute rage when
rust challenges are encountered in a CTF. Those who are insane end up solving the challenge. Writing this post to remember
the day I decided to lose my sanity.

I realized after the CTF that we can't really complain about the language or technology used for creating a _good_ challenge.
Malware developers will use the most obscure language the possibly can to squeeze in one more extra level of obscurity
over their malicious code.

The binary I received was written in rust and was stripped on top of it. I think the mentality that this binary will be hard because
it's written in rust took half of my energy on the spot. 

> The second rule of hacking is to know when to give up. First rule is to avoid the second rule as much as possible.

I spent about 10 hours trying to understand the code (almost 7 MB executable!). That was a really really bad move. After some
time was really really exhausted and was under the delusion that I reversed 40% of the code already (I'll doubt it if I now say it was 4%).

My other mistake was to not go through strings properly before even starting to understand the code. One day earlier on the professors
in my class told me this :

> If you're not a crazy fish then don't start analyzing programs from `main`, but start from strings, because strings
are easily understood by humans

Even though that idea hit me hard that time, because I usually started with `main` and thought of following his advice during reverse engineering
from next time, I fucked up when time came. 

Later on down the line while explaining my status to a CTF mentor, I got a suggestion that, if I know which libraries/rust-crates
are used in the program, I can generate IDA F.L.I.R.T signatures of them and the load the signatures to current IDA session to add
debug symbols to make code a bit more readable. I did that, took about 15-20 minutes to generate signatures for all involved libraries
I could recognize and then voila! _I c rust!_

For the sake of this blog, I downloaded a rust binary an ran strings on it, to verify that it's almost always possible to know which crates
are used in the binary.

```
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\rsa-0.9.8\src\algorithms\pad.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\rsa-0.9.8\src\algorithms\rsa.rs
failed to decrypt
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\rsa-0.9.8\src\algorithms\oaep.rs
C:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\iter\traits\iterator.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\subtle-2.6.1\src\lib.rs
C:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\ops\function.rs
Layoutsizealign
expand 32-byte kmid > len
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\generic-array-0.14.7\src\lib.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\cipher-0.4.4\src\stream_core.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\num-bigint-dig-0.8.4\src\biguint.rs
CapacityOverflowAllocErrlayoutC:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\smallvec-1.15.1\src\lib.rs
capacity overflow
assertion failed: new_cap >= len
C:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\slice\iter.rs
failed to write whole buffer
C:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\std\src\io\mod.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\digest-0.10.7\src\digest.rs
TryFromSliceErrorC:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\alloc\src\slice.rs
called `Result::unwrap()` on an `Err` valueC:\Users\duy\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\alloc\src\collections\btree\navigate.rs
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\cipher-0.4.4\src\stream.rs
StreamCipherError
C:\Users\duy\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\base64-0.22.1\src\engine\mod.rs
```

Rust binaries almost always contain the path of the rust file from where the error is originating at runtime.

Personally if I now have to create a challenge for the team that organized the CTF, I'll create a rust binary, then randomize these strings
with garbage data to get back at them :smirk:. Just kidding! :rofl: But that's a possibility in CTFs. Someone can change the names and paths
of the crates just to mislead you, to leave you with the only option to bang your head on the IDA screen!

Best of luck! Next time :wink:!
