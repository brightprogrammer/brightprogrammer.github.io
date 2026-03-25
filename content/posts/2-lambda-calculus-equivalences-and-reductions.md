---
author: "Siddharth Mishra"
title: "Lambda Calculus - Equivalences & Reductions"
date: "2025-02-06"
description: "Notes on Lambda Calculus"
tags:
  [
    "lambda calculus",
    "equivalence-relation",
    "reductions",
    "language",
    "automata-theory",
    "theory-of-computing",
  ]
categories: ["Lambda Calculus Notes",]
---

This section is important, because we'll learn how are applications performed on given
lambda expressions. 

{{< notice type="info" >}}
TL;DR, to apply a lambda term in a lambda expression, we use a series
of reductions. These reductions come from corresponding equivalence relations.
A reduction is just another way of replacing the lambda expression with a corresponding
equivalent expression.
{{< /notice >}}

# Equivalence

When considering equivalence of two expressions, they can be equivalent in four ways

- $\alpha$-equivalence - Renaming of bound variables
- $\beta$-equivalence - Function application and reduction
- $\eta$-equivalence - Function extensionality
- syntactic equivalence

These equivalences are basically the equivalence relations we talked about above. 
Using a series of these equivalence relations between two lambda expressions, we can
apply reductions to source lambda expression, and then reach a final, target expression
from a source expression.

When just $=$ is used to show equivalence, then it means the two lambda expressions
on either side have at least one of the above equivalence established.

## Alpha ($\stackrel{\alpha}{=}$) Equivalence

Two lambda expressions are $alpha$-equivalent if they differ only in the naming of
their variables. If we are to rename the variables, then it's we can them to look
identical.

### Examples

- $\lambda x . x \stackrel{\alpha}{=} \lambda a . a$
- $\lambda x . x \stackrel{\alpha}{\not =} \lambda a . b$

## Beta ($\stackrel{\beta}{=}$) Equivalence

If we have $\lambda x . M$ and $N$ as two lambda expressions then the $\beta$-conversion
$(\lambda x . M)N \stackrel{\beta}{=} M[x:=N]$ is said to establish a $\beta$-equivalence
between the expressions $(\lambda x . M)N$ can be replaced by $M[x:=N]$ without changing the
meaning of original expression.

This is mathematics equivalent of the simplification process.

### Examples :

- $(\lambda x . x + 1)3 \stackrel{\beta}{=} 3 + 1$ using [eqn $6$ from last post](/posts/1-lambda-calculus-conversion)
- $Iy \stackrel{\beta}{=} y$ because $I = \lambda x . x$, and to make it more precise, since $y$ is not [bound](/posts/3-lambda-calculus-free-and-bound-variables) to $I$, we can rewrite $I$ to $I \stackrel{\beta}{=} \lambda y. y$ using $\alpha$ equivalence.

## Eta ($\stackrel{\eta}{=}$) Equivalence

If two expressions always give same results when same input is provide to each, then
they're said to be $\eta$-equivalent.

### Examples

- $\lambda x . F x \stackrel{\eta}{=} F$
- $\lambda x . yy \stackrel{\eta}{=} yy$ 

## Syntactic ($\equiv$) Equivalence

Two lambda expressions are syntactically equivalent when they are identical. All
the arrangement, ordering, naming, everything is exactly same. When this happens,
you can obviously replace one with the other without a doubt.

# Equivalences As Reductions 

Denoting any of the equivalence relation ($\alpha$, $\beta$, $\eta$ or $\equiv$) with $\chi$,
and a series of applications of it as $\overset{\chi}{\underset{*}{\longrightarrow}}$

\\[
\begin{aligned}
{\chi}\text{-Basis } \frac{L \overset{\chi}{\underset{*}{\longrightarrow}} M}{L \stackrel{\chi}{=} M} & \quad &
{\chi}\text{-Reflexivity } \frac{}{L \stackrel{\chi}{=} L} \\\\
\\\\
{\chi}\text{-Symmetry} \frac{L \stackrel{\chi}{=} M}{M \stackrel{\chi}{=} L} & \quad &
{\chi}\text{-Transitivity} \frac{L \stackrel{\chi}{=} M, \quad M \stackrel{\chi}{=} N}{L \stackrel{\chi}{=} N} \\\\
\end{aligned}
\\]

This means, using these rules, and properties of equivalences, we can rewrite expressions
with the equivalent expression. Also for future reference, $\overset{\chi}{\underset{n}{\longrightarrow}}$
means $\chi$ reduction applied $n$ times consecutively.

Now that we have an understanding of what equivalence relations exist, we can
apply these inductively to perform applications over provided lambda terms, and
then simplify these applications to equivalent lambda terms.

\\[
\begin{aligned}
\text{example of } \beta \text{ and } \alpha \text{ reduction} \\\\
A & \stackrel{\beta}{=} \lambda f x . f f x                & \text{define A} \\\\
  & \stackrel{\alpha}{=} \lambda f y . f f y               & \text{change variable(s)}\\\\
  & \stackrel{\alpha}{=} \lambda h y . h h y \\\\
  & \stackrel{\alpha}{=} \lambda a b . a a b \\\\
\\\\
\text{example of a series of } \beta \text{ reductions}\\\\
A (\lambda x.x+1) 2 & \stackrel{\beta}{=} A[f:=(\lambda x.x+1),x:=2] & \text{application and then } \beta \text{ reduction} \\\\
& \stackrel{\beta}{=} (\lambda f x . f f x)[f:=(\lambda x.x+1),x:=2] & \text{A is } \beta \text{-equivalent with replaced expr}\\\\
& \stackrel{\beta}{=} (\lambda x.x+1)(\lambda x.x+1)2 \\\\
\\\\
(\lambda x.x+1)(\lambda x.x+1)2 &\stackrel{\beta}{=}  (\lambda x.x+1)(2+1) & \text{expanding second bracket}\\\\
& \stackrel{\beta}{=}  ((2+1)+1) \\\\
\text{or} \\\\
(\lambda x.x+1)(\lambda x.x+1)2 &\stackrel{\beta}{=}  ((\lambda x.x+1)2+1) & \text{expanding first bracket}\\\\
&\stackrel{\beta}{=}  ((2+1)+1) \\\\
\\\\
\text{example of } \eta \text{ reduction} \\\\
R & \stackrel{\beta}{=} \lambda t . 1 \stackrel{\eta}{=} 1 & \text{constant expression} \\\\
\end{aligned}
\\]
