---
author: "Siddharth Mishra"
title: "3. Lambda Calculus - Logic"
date: "2025-02-06"
description: "Notes on Lambda Calculus"
tags:
  [
    "lambda calculus",
    "logic",
    "logic-gates",
    "combinatory-logic",
    "language",
    "automata-theory",
    "theory-of-computing",
  ]
categories: ["Lambda Calculus Notes",]
---

## Logic

### If, Else

Let's build some boolean login out of power of pure combinations. Unlike usual logic, we won't get
`true`/`false` as values. Here `true` and `false` are lambda abstractions itself.

- $\text{True} \stackrel{\beta}{=} \lambda xy.x$ - Meaning, take two values, and evaluate to only the first one.
- $\text{False}\stackrel{\beta}{=} \lambda xy.y$ - Take two, and evaluate to only the second one, discarding the first.

These are often called $\text{First}$ and $\text{Second}$ correspondingly for these reasons. So we can write
$\text{First} \equiv \text{True}$ and $\text{Second} \equiv \text{False}$.

### AND Gate

And of any two expressions is `true` if and only of both are `true` at the same time for same input, and is `false` otherwise.
In here, again to remind, we don't deal with values, but lambda expressions, so we need the $\text{True}$ or $\text{False}$
expression.

Defining $\text{AND} \stackrel{\beta}{=} \lambda ab . aba$. Let's try it out with some values

<center>

|       $a$      |       $b$      |    $\text{AND} a b$      |    b a$                    |     Result     |
|----------------|----------------|--------------------------|----------------------------|----------------|
| $\text{True}$  | $\text{True}$  | $\text{AND True True}$   | $\text{True True True}$    | $\text{True}$  |
| $\text{True}$  | $\text{False}$ | $\text{AND True False}$  | $\text{True False True}$   | $\text{False}$ |
| $\text{False}$ | $\text{True}$  | $\text{AND False True}$  | $\text{False True False}$  | $\text{False}$ |
| $\text{False}$ | $\text{False}$ | $\text{AND False False}$ | $\text{False False False}$ | $\text{False}$ |

</center>

Note how judiciously selecting value among $\text{First}$ or $\text{Second}$ helped us create an `AND` gate! Infact, if we can create `NAND` gate,
then we can derive very other gate from it, becuase `NAND` is a turing complete instruction. Try searching "from nand to tetris" in your favorite
search engine.

### OR Gate

This time we want it to return true whenever either of $a$ or $b$ is $\text{True}$. 
Defining $\text{OR} \stackrel{\beta}{=} \lambda ab . aab$.

<center>

|       $a$      |       $b$      |     $\text{OR} a b$     |       $a a b$              |     Result     |
|----------------|----------------|-------------------------|----------------------------|----------------|
| $\text{True}$  | $\text{True}$  | $\text{OR True True}$   | $\text{True True True}$    | $\text{True}$  |
| $\text{True}$  | $\text{False}$ | $\text{OR True False}$  | $\text{True True False}$   | $\text{True}$  |
| $\text{False}$ | $\text{True}$  | $\text{OR False True}$  | $\text{False False True}$  | $\text{True}$  |
| $\text{False}$ | $\text{False}$ | $\text{OR False False}$ | $\text{False False False}$ | $\text{False}$ |
</center>

### NOT Gate

A NOT gate will just flip the bits right? If it's $\text{True}$, it should evaluate to $\text{False}$, and if it's $\text{False}$,
it shoud evaluate to $\text{True}$. This is easier than what we've seen before. 
Defining $\text{NOT} \stackrel{\beta}{=} \lambda a . a \ \text{False} \ \text{true}$.

<center>

|        $a$     |   $\text{NOT } a$  |    $a \text{ False True}$    |     Result     |
|----------------|--------------------|------------------------------|----------------|
| $\text{True}$  | $\text{NOT True}$  | $\text{True False True}$     | $\text{False}$ |
| $\text{False}$ | $\text{NOT False}$ | $\text{False False True}$    | $\text{True}$  |

</center>

All of this is just from combinations of different selections performed. How about a bit more difficult gate then?
How about XOR gate?

### XOR Gate

This is true only when both values are different. Defining $\text{XOR} \stackrel{\beta}{=} \lambda ab . a (b \ \text{False} \ \text{True}) b$.

<center>

|       $a$      |       $b$      |   $\text{XOR} a b$       | $a (b \ \text{False} \ \text{True}) b$  |     Result     |
|----------------|----------------|--------------------------|-----------------------------------------|----------------|
| $\text{True}$  | $\text{True}$  | $\text{XOR True True}$   | $\text{True (True False True) True}$    | $\text{False}$ |
| $\text{True}$  | $\text{False}$ | $\text{XOR True False}$  | $\text{True (False False True) False}$  | $\text{True}$  |
| $\text{False}$ | $\text{True}$  | $\text{XOR False True}$  | $\text{False (True False True) True}$   | $\text{True}$  |
| $\text{False}$ | $\text{False}$ | $\text{XOR False False}$ | $\text{False (False False True) False}$ | $\text{False}$ |

</center>

If you see carefully, then in both the $\text{False}$ cases, taking not of $b$ is not really required, it can be anything there, but just to make it work
with both cases of $\text{True}$, it has to be there.

### If-Then-Else

If a condition is $\text{True}$, we execute the $\text{Then}$ case, otherwise, we execute the $\text{Else}$ case.
This is basically selecting the $\text{First}$ or $\text{Second}$ of $\text{Then Else}$. Writing program
for this is easy : $\text{ITE} \stackrel{\beta}{=} \lambda c t e . c t e$. If $c$ is $\text{True}$ then
$\text{ITE} cte$ will evaluate to $t$, and in the other case, it'll evaluate to $e$.


### Loops?

If you have some experience with The Haskell programming language, then you'd know that purely functional
languages don't have a way to iterate over some statements like Turing Machines do. Recursion is the only
way. So, we create loops using recursion. Let's try to build up the idea of how we can do recursion in
lambda calculus.

{{< notice type="disclaimber" >}}
To be continued from here.
{{< /notice >}}
