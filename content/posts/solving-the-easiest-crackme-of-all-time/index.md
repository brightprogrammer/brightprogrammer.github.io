---
title: Solving The Easiest Crackme Of All Time
description: "WARNING : some of you may find this post boring and pointless!"
date: 2022-12-02T04:42:29.288Z
summary: ""
draft: false
tags:
  - reversing
  - crackme
  - beginner
categories:
  - reversing
---
H﻿i folks! My exams ended recently and I started working on my skills again. I've been learning cryptography and binary exploitation for past few days but my reversing skills havent improved much since past year. So I plan to solve atleast one crackme per day and write about it on my blog. This gives me motivation to keep on going (but I never actually go on)

## M﻿ost Easiest Crackme Of All Time

P﻿robably one of the main reasons I'm writing about this is because this binary failed to load when loaded in IDA due to some bad sections. You can download the binary from [here](https://crackmes.one/crackme/637c66b633c5d43ab4ecec2a).

## S﻿olution

Just run the binary (after maybe checking for malicious behaviour on VirusTotal) and then enter the key! What's the key you ask? Enter anything other than a non zero integer and you'll get a solve. It was a complete by chance solution so I went to check the assembly in radare and it actually is the real flag! So easy that you start doubting yourself!

{{< img src="screenshot-from-2022-12-02-10-22-01.png" alt="image showing the proof of solution" caption="proof of solve" title="proof of solve" >}}

Y﻿ou can also take a look at the disassembly but there's no point actually.

{{< img src="screenshot-from-2022-12-02-10-24-50.png" caption="disassembly of main" title="disassembly of main" >}}

P﻿rogram takes input in an integer and gives this integer to the checker function. Let's take a look at the checker function now.

{{< img src="screenshot-from-2022-12-02-10-32-37.png" caption="disassembly of checker" title="disassembly of checker" >}}

T﻿his will check whether the argument given to checker (the integer taken as input) is equal to 0 or not. If it's not zero then it'll spit out a flag else it'll throw some tantrums.