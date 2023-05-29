---
title: Overflow and Carry
date: 2023-04-30T15:05:44+05:30
description: "The Confusion Ends Here!"
tags: [overflow-carry, rizin, alu-design, intermediate-language]
categories: [alu-design, intermediate-language]
---

I've been working on uplifting PIC Mid-Range device assemblies to Rizin's RzIL. This has been quite interesting work so far but I encountered a conceptual blockage just when I started uplifting arithmetic instructions. I won't talk much about my work in Rizin here but you can seach around the blog to find related posts. I want this post to be as short as possible for those who just want the concept and not my story!

<!-- more -->

##### ALL THE DISCUSSIONS HERE ARE MOST APPLICABLE TO ADDITION OPERATION

### Concept of Carry
A carry bit is flagged only when certain conditions are met while treating the arithmetic operations as unsigned operation. By unsigned operations I mean that there's no differentiation between negative and positive numbers and all numbers are treated as positive numbers only!

When a carry bit is flagged, it states that the final result of operation is wrong! The area wasn't enough to fit the result and hence I'm flagging this to let you know that the result is wrong! Let's try to understand this by studying a one bit adder : 

```c
| x | y | res | carry? |
|---|---|-----|--------|
| 0 | 0 | 0   | no     |
| 0 | 1 | 1   | no     |
| 1 | 0 | 1   | no     |
| 1 | 1 | 10  | yes    | <---- This resulted in a carry because we had only 1 bit sized storage but it needed two!
```
In your system, the final result of last operation will be 0 instead of 10 if there's only one bit storage (talking hypothetically) and that's where the carry flag will tell you, hey! your result is wrong! go kick yourself!

But that's not all! Once we move to higher bits, things change slightly and one more concept is added :
- A `carry-in` is to tell that when **last** bits were added, that resulted in a carry!
- A `carry-out` is to tell that when **current** bits were added, that resulted in a carry!

The carry flag is set if there's a carry out from most significant bit. In one bit added we didn't have any concept of `carry-in` and there was only `carry-out` but here we need that. Let's take an example with 4-bit addition. I'll truncate the result to only 4 bits this time.

```c
| x    | y    | res  | carry |
|------|------|------|-------|
| 0100 | 0001 | 0101 | no    |
| 1000 | 0100 | 1100 | no    |
| 1000 | 0111 | 1111 | no    |
| 1000 | 1000 | 0000 | yes   |
| 1000 | 1111 | 0111 | yes   |
| 1111 | 0010 | 0001 | yes   |
```
Notice how the carry-in is moved from adding last two bits to next bits to perform addition. In most significant bit, since there's nowhere else to propagate this carry-in, it's used to flag the carry flag. Keep reading, we'll discuss later how to flag carry bit!!

### Concept of Overflow
Overflow flag is concerned only with signed operations! This will also tell you that your result is wrong (like carry flag). Again we take example of 1 bit adder to understand it

```c
| x | y | res | carry? |
|---|---|-----|--------|
| 0 | 0 | 0   | no     |
| 0 | 1 | 1   | no     |
| 1 | 0 | 1   | no     |
| 1 | 1 | 10  | yes    | <---- This resulted in an overflow because we added two negative numbers and got a positive result
```

This looks much similar to carry right?! Yes for the moment but let's take a look at 4 bit adder to see how things change. There's same concept of carry-in and carry-out here but the overflow flag is not flagged if there's a carry out. Overflow flag is flagged only when the sign of result is different from the sign of operands. If both operands are of different signs then overflow is never flagged but if they are same and result is of different sign then overflow is flagged.

```c
| x    | y    | res  | overflow                                        |
|------|------|------|-------------------------------------------------|
| 0100 | 0001 | 0101 | no  (same sign operands, same sign result)      |
| 1000 | 0100 | 1100 | no  (operands of different sign)                |
| 1000 | 0111 | 1111 | no  (same)                                      |
| 1000 | 1000 | 0000 | yes (same sign operands, different sign result) |
| 1000 | 1111 | 0111 | yes (same)                                      |
| 1111 | 0010 | 0001 | no                                              | <---- notice how this case is different from carry's table
```

Hence I proved it to you that overflow and carry are different. I picked cases at random so only one difference came out but there are lot more differences.

### Merging The Concepts
Your ALU doesn't differentiate between signed and unsigned and hence will flag both of these bits at the same time! Carry bit will be flagged if there was a carry-out from MSB and overflow bit will be flagged in STATUS register if there is a change of signs. Let's take a few more examples including the last ones : 

```c
| x    | y    | res  | carry | overflow |
|------|------|------|-------|----------|
| 0100 | 0001 | 0101 | no    | no       |
| 1000 | 0100 | 1100 | no    | no       |
| 1000 | 0111 | 1111 | no    | no       |
| 1000 | 1000 | 0000 | yes   | yes      |
| 1000 | 1111 | 0111 | yes   | yes      |
| 1111 | 0010 | 0001 | yes   | no       |
| 1111 | 1101 | 1100 | yes   | no       |
| 1111 | 1111 | 1110 | yes   | no       |
```

I think that's enough examples for now.

### Detecting Overflow
Detecting overflow is the easiest part here. We just need to check for sign of result and operands. How can we check if the sign of any two numbers are same or not? Think about it for a bit on your own! No? Let's analyze the following table for different cases of MSB of both operands and result.

```c
| x | y | res | overflow? |
|---|---|-----|-----------|
| 0 | 0 | 0   | no        |
| 0 | 0 | 1   | yes       | <---\
| 0 | 1 | 0   | no        |     |
| 0 | 1 | 1   | no        |     |________ (only these two result in an overflow)
| 1 | 0 | 0   | no        |     |
| 1 | 0 | 1   | no        |     |
| 1 | 1 | 0   | yes       | <---/
| 1 | 1 | 1   | no        |
```

Got some idea? No? Stare at it for 5 mins! Still no? Continue reading...

To check whether two operands are same or not, we can use the `XOR` operation. Result of a XOR is true if operands are different and false if both are same. Now, we want the result to have same sign as that of both the operands. 

![meme](/images/spiderman-mem-xor-xyres.jpg)  

What about taking logical `AND` of result of `XOR` between MSB or result and both operands at a time? Like this : `AND(XOR(MSB(x), MSB(res)), XOR(MSB(x), MSB(res)))`? Let's check if this works or not

```c
| x | y | res | overflow? | XOR(x, res) | XOR(y, res) | AND(XOR(x, res), XOR(y, res)) |
|---|---|-----|-----------|-------------|-------------|-------------------------------|
| 0 | 0 | 0   | no        | 0           | 0           | 0                             |
| 0 | 0 | 1   | yes       | 1           | 1           | 1                             |
| 0 | 1 | 0   | no        | 0           | 1           | 0                             |
| 0 | 1 | 1   | no        | 1           | 0           | 0                             |
| 1 | 0 | 0   | no        | 1           | 0           | 0                             |
| 1 | 0 | 1   | no        | 0           | 1           | 0                             |
| 1 | 1 | 0   | yes       | 1           | 1           | 1                             |
| 1 | 1 | 1   | no        | 0           | 0           | 0                             |
```

This seems to align properly! But can we make this check shorter? We need the uplifted IL to be as small and precise as possible! Think about it and do message me ツ

### Detecting Carry
This can be quite challenging to understand on your own, but I'm here to help you ¬‿¬ Similar to overflow's case we should make a table to see what we are expecting from your magical carry detector but here a few things change. We need to think about cases when there is a carry-in from last bit's addition too, and we only need to think about last bit's carry in. Why? Think about it ( ͡° ͜ °)

I'll consider only MSB of the operands and result.
```c
| x | y | carry-in | res | res (truncated) | carry? |
|---|---|----------|-----|-----------------|--------|
| 0 | 0 | 0        | 0   | 0               | no     |
| 0 | 0 | 1        | 1   | 1               | no     |
| 0 | 1 | 0        | 1   | 1               | no     |
| 0 | 1 | 1        | 10  | 0               | yes    |
| 1 | 0 | 0        | 1   | 1               | no     |
| 1 | 0 | 1        | 10  | 0               | yes    |
| 1 | 1 | 0        | 10  | 0               | yes    |
| 1 | 1 | 1        | 11  | 1               | yes    |
```

Nice, now we only need to think about which set of logical operations will give us this result. We'll there is a case where adding `1` and `1` gives `1` and a case whre adding `1` and `1` gives `0`. My personal way of finding the operations in cases like this is to start with basic operations like `AND` or `OR` or `XOR` between just two operands at a time and think how many predictions using this operations are true. If I make large number of successful predictions then that means I'm on right path and I try doing more logical operations over that result!

- If you took a logical `OR` and you are getting most cases correct but are predicting some more cases wrong then you probably need to take `AND` for this result with some other paramter
- If you took logical `AND` and you are getting some less cases correct then you probably need to take `OR` with some other variables.

Here I see that when I do `AND(MSB(x), MSB(y))` then I get only last two cases correct and rest fail. Next I notice that if I take `OR` of this result with the negation of `MSB(res)` then one more cases are predicted correctly! but not all! Why `OR`? Start reading this paragraph from top again ツ Also, please don't take carry-in into consideration while performing these operations because let's assume we don't have that at the moment! Just use `x`, `y` and `res`.

```c
| x | y | carry-in | res | res (truncated) | carry? | AND(x, y) | NEG(res) | OR(AND(x, y), NEG(res)) |
|---|---|----------|-----|-----------------|--------|-----------|----------|-------------------------|
| 0 | 0 | 0        | 0   | 0               | no     | 0         | 1        | 1                       | <---- wrong here
| 0 | 0 | 1        | 1   | 1               | no     | 0         | 0        | 0                       |
| 0 | 1 | 0        | 1   | 1               | no     | 0         | 0        | 0                       |
| 0 | 1 | 1        | 10  | 0               | yes    | 0         | 1        | 1                       |
| 1 | 0 | 0        | 1   | 1               | no     | 0         | 0        | 0                       |
| 1 | 0 | 1        | 10  | 0               | yes    | 0         | 1        | 0                       | <---- wrong here
| 1 | 1 | 0        | 10  | 0               | yes    | 1         | 1        | 1                       |
| 1 | 1 | 1        | 11  | 1               | yes    | 1         | 0        | 1                       |
```

Next, I after some more hit and trial, I find that the end operation is `OR(AND(MSB(x), MSB(y)), AND(OR(MSB(x), MSB(y)), NEG(MSB(res))))` and it predicts all results correctly! Let's verify this too.

```c
| x | y | carry-in | res | carry? | AND(x, y) | OR(x, y) | NEG(res) | AND(OR(x, y), NEG(res)) | OR(AND(x, y), AND(OR(x, y), NEG(res))) |
|---|---|----------|-----|--------|-----------|----------|----------|-------------------------|----------------------------------------|
| 0 | 0 | 0        | 0   | no     | 0         | 0        | 1        | 0                       | 0                                      |
| 0 | 0 | 1        | 1   | no     | 0         | 0        | 0        | 0                       | 0                                      |
| 0 | 1 | 0        | 1   | no     | 0         | 1        | 0        | 0                       | 0                                      |
| 0 | 1 | 1        | 0   | yes    | 0         | 1        | 1        | 1                       | 1                                      |
| 1 | 0 | 0        | 1   | no     | 0         | 1        | 0        | 0                       | 0                                      |
| 1 | 0 | 1        | 0   | yes    | 0         | 1        | 1        | 1                       | 1                                      |
| 1 | 1 | 0        | 0   | yes    | 1         | 1        | 1        | 1                       | 1                                      |
| 1 | 1 | 1        | 1   | yes    | 1         | 1        | 0        | 0                       | 1                                      |
```

### Carry Flag As Borrow Bit?
Using similar approach you can get an expression to deduce whether there was a borrow or not. Let me give you some hints here : 
- Draw a table with all possible values of MSB of `x`. `y` and `res` (total 8 rows : `2*2*2`)
- Think about possible cases where there can be a borrow. You don't need to worry about carry-in here! There will be only 4 such cases!
- Then find some operations that include predict some results correctly and some results wrong and try taking `AND` or `OR` of these to find the end result.

My answer is : `OR(OR(AND(NOT(x), r), AND(NOT(x), b)), AND(x, AND(y, r)))`

### Some Background
I had my difficulties reaching this result. I already had some reference code in Rizin to take look and just copy paste them but I didn't want that for me! I need to understand whatever I'm doing because I'm here to learn. After struggling for a while, I created a python script to help me test these results because I didn't want to create these tables before writing this post.

```python
# get most significant bit of 4 bit number
def msb4(n):
    return (n&(1<<3))>>3

# get lower 4 bits of given number
def get4(n):
    return n&0xf

# convert given number to
# corresponding binary string
# bin4 means nibble (4bits)
def bin4tostr(n):
    s = ""
    for i in range(4):
        if(n & (1 << (3-i))): s += "1"
        else: s += "0"
    return s

def AND(a, b):
    return a&b

def OR(a, b):
    return a|b

def XOR(a, b):
    return a^b

def NOT(a):
    return ~a

def check_carry4(a, b):
    msba = msb4(a)
    msbb = msb4(b)
    msbr = msb4(a+b)

    return OR(AND(msba, msbb), AND(OR(msba, msbb), NOT(msbr)))

def check_overflow4(a, b):
    msba = msb4(a)
    msbb = msb4(b)
    msbr = msb4(a+b)
    return AND(XOR(msba, msbr), XOR(msbb, msbr))

for i in range(16):
    for j in range(16):
        msbi = msb4(i)
        msbj = msb4(j)
        res = get4(i+j)
        msbr = msb4(res)
       
        ostr = 'carry' if check_carry4(i, j) else 'overflow' if check_overflow4(i, j) else 'none'

        print(f"msb(i) = {msbi} | msb(j) = {msbj} | msb(res) = {msbr} | {bin4tostr(i)} + {bin4tostr(j)} = {bin4tostr(res)} | {ostr}")
```

Check it's output and compare the result for yourselves.

That was all for this post, I hope to see you in some other post again. If you liked it please write me a review ツ
