---
author: "Siddharth Mishra"
title: "4. Lambda Calculus - Fixed Point Theorem"
date: "2025-02-06"
description: "Notes on Lambda Calculus"
tags:
  [
    "lambda calculus",
    "fixed-point-theorem",
    "fixed-point",
    "fixed-point-combinator",
    "language",
    "automata-theory",
    "theory-of-computing",
  ]
categories: ["Lambda Calculus Notes",]
---

## Fixed Point Theorem

> $ \forall F \quad \exists X \mid FX = X $  
>
> For all lambda expression $F$, there exists another lambda expression $X$, such that $FX = X$, meaning when $F$ is 
> applied over $X$ we get $X$ (itself).

- Let's take $F = \lambda x . x$ (the identity abstraction), Then any lambda expression can take place of $X$.  
- Now consider $F = \lambda x . y$, then we have $X \equiv y$, because $(\lambda x . y)y = y$.  
- If $F = \lambda x . xy$, then? Then can use $X \stackrel{\beta}{=} \lambda y . X$, because $FX \equiv (\lambda x . xy)(\lambda y . X) \stackrel{\beta}{\rightarrow} (\lambda y . X) y \stackrel{\beta}{\rightarrow} X$.
- What if $F = \lambda x . xx$ then? We have $X \stackrel{\beta}{=} \lambda x . x$ or $X \stackrel{\eta}{=} I$ (the identity abstraction). Then $FX = FI = II = I$.

{{< notice type="info" >}}
These fixed points are not unique. Consider the lambda expression $F \stackrel{\beta}{\=} \lambda x . x$. Take any $X$ and, it'll be
a fixed point of this.
{{< /notice >}}

{{< notice type="disclaimer" >}}
Proofs for the fixed point theorem already exist. I do not understand the proofs right now, becuase I feel I
need more familiarity with lambda calculus. I'll come back to this once I feel confident to prove this myself.
I know for now that the key to proving this is recursion. I'm figuring out how can we do recursion in lambda
calculus.
{{< /notice >}}
