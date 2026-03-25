---
author: "Siddharth Mishra"
title: "Lambda Calculus - Free & Bound Variables"
date: "2025-02-06"
description: "Notes on Lambda Calculus"
tags:
  [
    "lambda calculus",
    "free-variables",
    "bound-variables",
    "language",
    "automata-theory",
    "theory-of-computing",
  ]
categories: ["Lambda Calculus Notes",]
---

# Free & Bound Variables

A variable occurrence is **bound** if it lies inside the scope of some $\lambda$ that binds it.
Otherwise it's **free**. Free variables are just the "inputs" a term still depends on.

{{< notice type="info" >}}
When I say a variable is free/bound, I mean the **occurrence**. The same symbol can be both free
and bound inside the same expression.
{{< /notice >}}

## Definitions

We can define the set of free variables $\text{FV}(M)$ and bound variables $\text{BV}(M)$ inductively:

\\[
\begin{aligned}
\text{FV}(x) & = \{x\} \\\\
\text{FV}(MN) & = \text{FV}(M) \cup \text{FV}(N) \\\\
\text{FV}(\lambda x . M) & = \text{FV}(M) \setminus \{x\}
\end{aligned}
\\]

\\[
\begin{aligned}
\text{BV}(x) & = \varnothing \\\\
\text{BV}(MN) & = \text{BV}(M) \cup \text{BV}(N) \\\\
\text{BV}(\lambda x . M) & = \text{BV}(M) \cup \{x\}
\end{aligned}
\\]

If $\text{FV}(M)=\varnothing$, then $M$ is **closed** (also called a combinator).

## Examples

- $\lambda x . x$ has $\text{FV} = \varnothing$ and $\text{BV} = \{x\}$.
- $\lambda x . y$ has $\text{FV} = \{y\}$ and $\text{BV} = \{x\}$.
- $x (\lambda x . x)$ has $\text{FV} = \{x\}$ and $\text{BV} = \{x\}$ (same symbol, different occurrences).
- $(\lambda x . x y) z$ has $\text{FV} = \{y, z\}$ and $\text{BV} = \{x\}$.

## Substitution And Variable Capture

Substitution is written as $M[x := N]$. During $\beta$-reduction, we replace the bound variable with the
argument.

- $(\lambda x . x y) z \stackrel{\beta}{\rightarrow} z y$ (the $y$ stays free).

Sometimes direct substitution can **capture** a free variable, which is not allowed. We avoid this by
renaming bound variables ($\alpha$-conversion).

\\[
(\lambda x . \lambda y . x) y \stackrel{\alpha}{=} (\lambda x . \lambda z . x) y \stackrel{\beta}{\rightarrow} \lambda z . y
\\]

So, when doing substitutions, always make sure you're not accidentally binding a free variable.
