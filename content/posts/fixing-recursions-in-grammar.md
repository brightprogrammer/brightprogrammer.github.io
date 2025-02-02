---
author: "Siddharth Mishra"
title: "Fixing Recursions In Grammar"
date: "2025-02-01"
description: "Left & Mutual Recursion Mitigation"
tags: ["grammar", "language", "automata-theory", "theory-of-computing", "parsing"]
math: true
---

# Fixing Left Recursion

A grammar is left recursive if it comes in the following form 

\\[
\langle S \rangle ::= \langle S \rangle \  a \mid b
\\]

When parsing or generating a string using this grammar, where $S$ is the start symbol, you
are likely to enter a state of infinite recursion. Any ideas on how to fix this?  

\\[
\langle S \rangle ::= b \mid \langle S \rangle \  a
\\]

Rewriting it in above form won't change a thing, except the fact that it'll try to read or
generate the terminal $b$ first. How do we fix this then? The root of our problem is
left recursion, so if we can somehow make it right recursive then it'll fix our issue.
Before reading any further, give it a try yourself.

## Language Analysis

Let's start by generating some sample strings in the given language, and try to discover
a pattern. The following are expansion paths for $S$ :

\\[
\begin{align}
L(S) &= b \\\\
L(S) &= \langle S \rangle a \rightarrow
\langle S \rangle \  a \  a \rightarrow
\langle S \rangle \  a \  a \  ... \  a \rightarrow
b \  a \  a \  ... \  a
\end{align}
\\]

So we have two possible expansions $b$ or $b \ a^\*$. The symbol $\*$ means as many repetitions
of anything that comes before it. It can be nothing, like an empty string, or it can be
something. So, this lets us know that a left recursive grammar always starts with $b$, 
and then you generate or match as many $a$ as possible. The interesting thing about $a^\*$
is that it can be generated with right recursion as well, with a rule like :

\\[
\langle N \rangle = a \langle N \rangle
\\]

Now this can also be generated with a left recursion as well, but we're doing all this
just to avoid it, so we only care about right recursion. Now combining all the information
we've gather up until now, we can 
 
\\[
\begin{align}
\langle S \rangle &::= b  \langle S' \rangle \\\\
\langle S' \rangle &::= a  \langle S' \rangle
\end{align}
\\]

This grammar as you can see is completely right recursive.

## Real Life Example

So, I've been (re)writing a C++ demangler for RizinOrg's [rz-libdemangle](https://github.com/rizinorg/rz-libdemangle/pull/69)
which was previously licensed to GPL, and I'm re-writing it to relicense it to LGPL v3, which is more
permissive for commercial usage. You are allowed to link to precompiled binaries licensed with LGPLv3.

While re-writing grammar for [Itanium ABI](https://files.brightprogrammer.in/cxx-abi/abi.html), I encountered
a left recursive grammar.

\\[
\begin{align}
\langle \text{prefix} \rangle &::= \langle \text{unqualified-name} \rangle \\\\
&\quad \mid \langle \text{prefix} \rangle  \langle \text{unqualified-name} \rangle \\\\
&\quad \mid \langle \text{template-prefix} \rangle  \langle \text{template-args} \rangle \\\\
&\quad \mid \langle \text{closure-prefix} \rangle \\\\
&\quad \mid \langle \text{template-param} \rangle \\\\
&\quad \mid \langle \text{decltype} \rangle \\\\
&\quad \mid \langle \text{substitution} \rangle
\end{align}
\\]

Notice how production number $6$ is left recursive in nature. Wanna know how I fixed it in code?
You'll have to follow this post a bit more. Real life examples are bit more complex than theory.
Life happend here as well, and made some things not-so-straightforward.

# Mutual Left Recursion

A mutual left recursion happens when two rules mutually call each other by expanding
first non terminal as other rule. It generally looks like this :

\\[
\begin{align}
\langle S \rangle &::= \langle A \rangle \mid \langle B \rangle \\\\
\langle A \rangle &::= \langle B \rangle k \mid X \\\\
\langle B \rangle &::= \langle A \rangle m \mid Y
\end{align}
\\]

Notice how production $13$ and $14$ call each other, making it a mutual recursion.
Using a similar analysis as done for simple left recursion, we can remove left recursion
here as well, by making each rule right recursion only.

## Language Analysis

If you try to follow the pattern, then you'll get the following possible languages

\\[
\begin{align}
L(A) &= X (mk)^\* \\\\
L(A) &= Y k(mk)^\* \\\\
L(B) &= Y (km)^\* \\\\
L(B) &= X m(km)^\*
\end{align}
\\]

Noticing this pattern again, I can clearly see the right recursion this time again,
so, I'll re-write the mutually left recursive grammar as follows

\\[
\begin{align}
\langle S \rangle  & ::= & \langle S1 \rangle \mid \langle S2 \rangle \\\\
\langle A \rangle  & ::= & X \mid Y k \\\\
\langle B \rangle  & ::= & Y \mid X m \\\\
\langle R1 \rangle & ::= & m k \langle R1 \rangle \\\\
\langle R1 \rangle & ::= & k m \langle R2 \rangle \\\\
\langle S1 \rangle & ::= & \langle A \rangle \mid \langle A \rangle \langle R1 \rangle \\\\
\langle S2 \rangle & ::= & \langle B \rangle \mid \langle B \rangle \langle R2 \rangle
\end{align}
\\]

Again, notice that since the only recursive productions $20$ and $21$ are right
recursive only, the whole grammar is right recursive, and at the same time,
the grammar is no more mutually left recursive.

## Real Life Example

So, while (re)writing the demangler, I came across some rules that are mutually
recursive. Take a look at the following grammar, and comment what you see :

\\[
\begin{align}
\langle \text{prefix} \rangle &::= \langle \text{unqualified-name} \rangle \\\\
&\quad \mid \langle \text{prefix} \rangle  \langle \text{unqualified-name} \rangle \\\\
&\quad \mid \langle \text{template-prefix} \rangle  \langle \text{template-args} \rangle \\\\
&\quad \mid \langle \text{closure-prefix} \rangle \\\\
&\quad \mid \langle \text{template-param} \rangle \\\\
&\quad \mid \langle \text{decltype} \rangle \\\\
&\quad \mid \langle \text{substitution} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix} \rangle &::= \langle \text{template unqualified-name} \rangle \\\\
&\quad \mid \langle \text{prefix} \rangle  \langle \text{template unqualified-name} \rangle \\\\
&\quad \mid \langle \text{template-param} \rangle \\\\
&\quad \mid \langle \text{substitution} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix} \rangle &::= [ \langle \text{prefix} \rangle ]  \langle \text{variable or member unqualified-name} \rangle  M \\\\
&\quad \mid \langle \text{variable template template-prefix} \rangle  \langle \text{template-args} \rangle  M
\end{align}
\\]

Did you notice it? $\langle \text{prefix} \rangle$ is mutually left recursive with $\langle \text{template-prefix} \rangle$
and $\langle \text{closure-prefix} \rangle$ at the same time, and this is where things get a bit complicated.
The solution is not hard, it's really simple though. I'll have to show my original solution though.

# Solution

For making things easy while writing the demangler, and for easy implementation of grammar rules
and productions, I've devised some macros that make it look like I'm using a DSL to write the demangler.
So, to help you understand, I'll just show you the before and after code, and leave you to diff these out
by yourself to understand. You can see the complete source code in the PR, or in source code of
[rz-libdemangle](https://github.com/rizinorg/rz-libdemangle) after my PR is merged.

## Before Solving Anything

Before I've made any fixes to the grammar, here's how the productions look in code :

```c
DECL_RULE(prefix);
DECL_RULE(template_prefix);
DECL_RULE(closure_prefix);

DEFN_RULE (prefix, {
    MATCH (RULE (unqualified_name));
    MATCH (RULE (prefix) && RULE (unqualified_name));
    MATCH (RULE (template_prefix) && RULE (template_args));
    MATCH (RULE (closure_prefix));
    MATCH (RULE (template_param));
    MATCH (RULE (decltype));
    MATCH (RULE (substitution));
});

DEFN_RULE(template_prefix, {
    MATCH (RULE (template_unqualified_name));
    MATCH (RULE (prefix) && RULE (template_unqualified_name));
    MATCH (RULE (template_param));
    MATCH (RULE (substitution));
});

DEFN_RULE(closure_prefix, {
    MATCH (RULE_OPTIONAL (prefix) && RULE (variable_or_member_unqualified_name) && READ ('M')); 
    MATCH (RULE (variable_template_template_name) && RULE (template_args) && READ ('M')); 
});
```

So? Do you notice many mutual recursions at the same time. How do we fix this?
To be honest, at the time of writing this, I haven't checked the code, but I'm pretty sure
that my theory is right.

## After The Changes

```c
DEFN_RULE (prefix_X, {
    MATCH (RULE (unqualified_name));
    MATCH (RULE (template_param));
    MATCH (RULE (decltype));
    MATCH (RULE (substitution));
});

DEFN_RULE (prefix_Yk_template_prefix, {
    MATCH (RULE (template_unqualified_name) && RULE (template_args));
    MATCH (RULE (template_param) && RULE (template_args));
    MATCH (RULE (substitution) && RULE (template_args));
});

DEFN_RULE (prefix_A_template_prefix, {
    MATCH (RULE (prefix_X));
    MATCH (RULE (prefix_Yk_template_prefix));
});

DEFN_RULE (prefix_mk_template_prefix, {
    MATCH (RULE (template_unqualified_name) && RULE (template_args));
});

DEFN_RULE (prefix_S1_template_prefix, {
    MATCH (RULE (prefix_A_template_prefix) && RULE_MANY (prefix_mk_template_prefix));
});

DEFN_RULE (prefix_Yk_closure_prefix, {
    MATCH (RULE (variable_template_template_prefix) && RULE (template_args) && READ ('M'));
});

DEFN_RULE (prefix_A_closure_prefix, {
    MATCH (RULE (prefix_X));
    MATCH (RULE (prefix_Yk_closure_prefix));
});

DEFN_RULE (prefix_mk_closure_prefix, {
    MATCH (RULE (variable_or_member_unqualified_name) && READ ('M'));
});

DEFN_RULE (prefix_S1_closure_prefix, {
    MATCH (RULE (prefix_A_closure_prefix) && RULE_MANY (prefix_mk_closure_prefix));
});

DEFN_RULE (prefix, {
    // fix left-recursion
    MATCH (RULE (prefix_X) && RULE_MANY (unqualified_name));

    // fix mutual-recursions
    MATCH (RULE (prefix_S1_template_prefix));
    MATCH (RULE (prefix_S1_closure_prefix));
});

```

The changes made for $ \langle \text{closure-prefix} \rangle $ :


```c
DEFN_RULE (closure_prefix_Y, {
    MATCH (RULE (variable_template_template_prefix) && RULE (template_args) && READ ('M'));
});

DEFN_RULE (closure_prefix_Xm_prefix, {
    MATCH (RULE (unqualified_name) && RULE (variable_or_member_unqualified_name) && READ ('M'));
    MATCH (RULE (template_param) && RULE (variable_or_member_unqualified_name) && READ ('M'));
    MATCH (RULE (decltype) && RULE (variable_or_member_unqualified_name) && READ ('M'));
    MATCH (RULE (substitution) && RULE (variable_or_member_unqualified_name) && READ ('M'));
});

DEFN_RULE (closure_prefix_km_prefix, {
    MATCH (RULE (variable_template_template_prefix) && RULE (template_args) && READ ('M'));
});

DEFN_RULE (closure_prefix_B, {
    MATCH (RULE (closure_prefix_Y));
    MATCH (RULE (closure_prefix_Xm_prefix));
});

DEFN_RULE (closure_prefix_S2_prefix, {
    MATCH (RULE (closure_prefix_B) && RULE_MANY (closure_prefix_km_prefix));
});

DEFN_RULE (closure_prefix, { MATCH (RULE (closure_prefix_S2_prefix)); });
```

The changes made for $ \langle \text{template-prefix} \rangle $ :

```c
DEFN_RULE (template_prefix_Y, {
    MATCH (RULE (template_unqualified_name));
    MATCH (RULE (template_param));
    MATCH (RULE (substitution));
});

DEFN_RULE (template_prefix_Xm_prefix, {
    MATCH (RULE (unqualified_name) && RULE (template_unqualified_name));
    MATCH (RULE (template_param) && RULE (template_unqualified_name));
    MATCH (RULE (decltype) && RULE (template_unqualified_name));
    MATCH (RULE (substitution) && RULE (template_unqualified_name));
});

DEFN_RULE (template_prefix_km_prefix, {
    MATCH (RULE (template_args) && RULE (template_unqualified_name));
});

DEFN_RULE (template_prefix_B, {
    MATCH (RULE (template_prefix_Y));
    MATCH (RULE (template_prefix_Xm_prefix));
});

DEFN_RULE (template_prefix_S2_prefix, {
    MATCH (RULE (template_prefix_B) && RULE_MANY (template_prefix_km_prefix));
});

DEFN_RULE (template_prefix, { MATCH (RULE (template_prefix_S2_prefix)); });
```

This is my current fix. This fixed any recursion issues for now. Previously I was getting
stack overflow, because the stack frames just kept getting growing up and up. For those of you
who are not comfortable with the code, here's the grammar form :


\\[
\begin{align}
\langle \text{prefix-X} \rangle & ::= & \langle \text{unqualified-name} \rangle \\\\
                                & \quad \mid & \langle \text{template-param} \rangle \\\\
                                & \quad \mid & \langle \text{decltype} \rangle \\\\
                                & \quad \mid & \langle \text{substitution} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{prefix-Yk-template-prefix} \rangle & ::= & \langle \text{template-unqualified-name} \rangle \ \langle \text{template-args} \rangle \\\\
                                                 & \quad \mid & \langle \text{template-param} \rangle \ \langle \text{template-args} \rangle \\\\
                                                 & \quad \mid & \langle \text{substitution} \rangle \ \langle \text{template-args} \rangle \\\\
\langle \text{prefix-A-template-prefix} \rangle & ::= & \langle \text{prefix-X} \rangle \\\\
                                                & \quad \mid & \langle \text{prefix-Yk-template-prefix} \rangle \\\\
\langle \text{prefix-mk-template-prefix} \rangle & ::= & \langle \text{template-unqualified-name} \rangle \ \langle \text{template-args} \rangle \\\\
\langle \text{prefix-S1-template-prefix} \rangle & ::= & \langle \text{prefix-A-template-prefix} \rangle \ \langle \text{prefix-mk-template-prefix} \rangle ^\* 
\end{align}
\\]

\\[
\begin{align}
\langle \text{prefix-Yk-closure-prefix} \rangle & ::= & \langle \text{variable-template-template-prefix} \rangle \ \langle \text{template-args} \rangle \ M \\\\
\langle \text{prefix-A-closure-prefix} \rangle & ::= & \langle \text{prefix-X} \rangle \\\\
                                               & \quad \mid & \langle \text{prefix-Yk-closure-prefix} \rangle \\\\
\langle \text{prefix-mk-closure-prefix} \rangle & ::= & \langle \text{variable-or-member-unqualified-name} \rangle \ M \\\\
\langle \text{prefix-S1-closure-prefix} \rangle & ::= & \langle \text{prefix-A-closure-prefix} \rangle \ \langle \text{prefix-mk-closure-prefix} \rangle ^\*
\end{align}
\\]

\\[
\begin{align}
\langle \text{prefix} \rangle & ::= & \langle \text{prefix-X} \rangle \ \{\langle \text{unqualified-name} \rangle ^\*\} \\\\
              & \mid & \langle \text{prefix-S1-template-prefix} \rangle \\\\
              & \mid & \langle \text{prefix-S1-closure-prefix} \rangle 
\end{align}
\\]


The changes made for $ \langle \text{closure-prefix} \rangle $ :

\\[
\begin{align}
\langle \text{closure-prefix-Y} \rangle & ::= & \langle \text{variable-template-template-prefix} \rangle \ \langle \text{template-args} \rangle \ M 
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix-Xm-prefix} \rangle & ::= & \langle \text{unqualified-name} \rangle \ \langle \text{variable-or-member-unqualified-name} \rangle \ M \\\\
                                                & \quad \mid & \langle \text{template-param} \rangle \ \langle \text{variable-or-member-unqualified-name} \rangle \ M \\\\
                                                & \quad \mid & \langle \text{decltype} \rangle \ \langle \text{variable-or-member-unqualified-name} \rangle \ M \\\\
                                                & \quad \mid & \langle \text{substitution} \rangle \ \langle \text{variable-or-member-unqualified-name} \rangle \ M
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix-B} \rangle & ::= & \langle \text{closure-prefix-Y} \rangle \\\\
                                        & \quad \mid & \langle \text{closure-prefix-Xm-prefix} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix-km-prefix} \rangle ::= \langle \text{variable or member unqualified-name} \rangle  M
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix-S2-prefix} \rangle & ::= & \langle \text{closure-prefix-B} \rangle \ \langle \text{closure-prefix-km-prefix} \rangle ^\*
\end{align}
\\]

\\[
\begin{align}
\langle \text{closure-prefix} \rangle & ::= & \langle \text{closure-prefix-S2-prefix} \rangle
\end{align}
\\]

The changes made for $ \langle \text{template-prefix} \rangle $ :

\\[
\begin{align}
\langle \text{template-prefix-Y} \rangle & ::= & \langle \text{template-unqualified-name} \rangle \\\\
                                         & \quad \mid & \langle \text{template-param} \rangle \\\\
                                         & \quad \mid & \langle \text{substitution} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix-Xm-prefix} \rangle & ::= & \langle \text{unqualified-name} \rangle \ \langle \text{template-unqualified-name} \rangle \\\\
                                                 & \quad \mid & \langle \text{template-param} \rangle \ \langle \text{template-unqualified-name} \rangle \\\\
                                                 & \quad \mid & \langle \text{decltype} \rangle \ \langle \text{template-unqualified-name} \rangle \\\\
                                                 & \quad \mid & \langle \text{substitution} \rangle \ \langle \text{template-unqualified-name} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix-B} \rangle & ::= & \langle \text{template-prefix-Y} \rangle \\\\
                                               & \quad \mid & \langle \text{template-prefix-Xm-prefix} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix-km-prefix} \rangle ::= \langle \text{template-args} \rangle \langle \text{template-unqualified-name} \rangle
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix-S2-prefix} \rangle & ::= & \langle \text{template-prefix-B} \rangle \ \langle \text{template-prefix-km-prefix} \rangle ^\*
\end{align}
\\]

\\[
\begin{align}
\langle \text{template-prefix} \rangle & ::= & \langle \text{template-prefix-S2-prefix} \rangle
\end{align}
\\]

# Final Comments

Grammars are very hard to get right in the first try. You are basically developing your
own language. It takes experience, which basically demands you beforehand about what you
want and what you don't want. The other way is doing it iteratively, which is another
name for trial-and-error (and as I said, hard to get right in first try).

Did you like the post? Drop in a comment! If you find any error in this post, I'm only a human,
and I'll accept my mistakes, and make any changes if required.
