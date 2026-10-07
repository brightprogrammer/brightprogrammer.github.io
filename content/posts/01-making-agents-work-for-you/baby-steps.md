---
author: "Siddharth Mishra"
title: "Making Agents Work For You"
date: "2026-10-07"
description: "Introductory Series In Making Agentic Workflows"
tags:
  [
    "harness",
    "agent",
    "llm",
    "workflow",
  ]
categories: ["agent", "harness",]
---

This will be a series of posts because I want this to be as practical as possible, and beacuse of that
an attempt to capture this all in a single post would be something that I'm only ever going to do when
I'm not in my right mind.

Tentative split is like this :

- This post : Talk about how I started and my perception before and after the work.
  Also give some introductory ideas and jargons.
- Next post : Get things running. Write a very basic hello world style harness.
- Third post : Get some tools in. Introducing problems and a goal to the agent and
    watching it use the tools to achieve the goal
- Fourth post : Experimentations on tool usage and prompts. Understanding the world
    the agent experiences.
- Final post : Giving agent a full problem to solve

I will be writing this series of posts as if I'm talking to a newbie because I myself
started as a newbie.

# Contrasting Ideas

At the start of this year, I was very skeptical of the idea of an agent doing all job.
I still am! I'm only skeptical though, I don't have full proofs of either side of the answer.
I only have arguments to make for the side of answer I want to believe in. Because of me
being skeptical, I started exploring late than others.

Almost mid-year I was using agents to work because I used one time and I realized the
potenial of speeding up my work. ASU (my college) allowed students, free access to OpenAI frontier
models and we had a blast using frontier level intelligence. It was fun while it lasted.
Later the access got very strict because of disproportional use of the token budgets. Some
experts used the agents a lot while they got the chance, maybe because they already knew
the potential and were already looking for an opportunity.

Past mid-year, after DEFCON, I realized I had my Mac Mini lying around and stays mostly off.
I also knew that in today's world, if you can put some compute power to good use, you can profit
out off that. I'm also an avid homelabber and I host almost all of the services I nowadays use.
I own the data, I own the infrastructure! What about LLMs though? I neither own the data and neither
the infrastructure!

How can I put a good use to this Mac Mini? FYI, I already tried running harnesses and LLM servers
like LmStudio, llama.cpp on this machine. I did not like that because, first of all, I was not really
paying attention to how it worked, I just expected it to work, and next I didn't really knew what works best.
I tried it back then and it didn't work out for me. I tried a few different models back then. I was already
having debates with my fellow PhD students about using AI (or SI??) agents for bug hunting. My stance was that
using AI agents for hunting bugs and writing exploits is not a good idea (FYI, I have 0 record of finding bugs
in a widely used software, and 0 record of any 0-day or even n-day exploits, I want to make that non-zero though).
I was talking with people who are really good at what they do (v/s me who is a noob in bug hunting and exploitation).
My stance was that bug hunting is done for having fun, having that dopamine hit every time
you find and exploit a bug and get a CVE assigned for it and using an AI agent to do that takes away that fun from
you.

# Inception

After DEFCON, it just hit me that I can have that fun that I want to have, by writing the
bug hunting workflow myself. It'll be like writing a program that finds bugs in other programs.
What if I can do my research work and learn some agentic bug hunting at the same time? What
if I can do more things? I host many servers, what if I just use the agent to monitor service
health for me and give me notifications on something serious?

At this time, I also had recently skimmed over some interesting blog posts that talk about how
local models can compete with frontier models for bug hunting. The claim they made was that system
can help complement solving the challenges faced by model. To be specific, this was the post that
inspired me a lot : [System Over Model : Zero-Day Discovery at the Jagged Frontier](https://aisle.com/blog/system-over-model-zero-day-discovery-at-the-jagged-frontier).
In other words, model size alone is not a good heuristic of whether or not the model will be able
to achieve a given goal in given time. They claim that how the model is asked to achieve the goal,
and the set of tools at the model's disposal also impact how good the model will perform.

{{< notice type="info" >}}
I realized, that all you need is a model good enough at reasoning. After some experiments,
I realized that Gemma4 26B A4B at 4-bit quantization works best for me, given the infrastructure I have
at this moment. It has really good reasoning skills given that it can run on a small machine like the one
I own.
{{< /notice >}}

# Infrastructure

I own a Mac Mini M2 24G RAM shared between GPU and CPU. This is one thing that I own (other than my knowledge)
that in the span of the time I own, only increased it's value. A case of not diminishing return.
This machine is more valuable than the price I got it for.

Another interesting thing about this machine is that I got this machine only to deliver software for a client
I used to work with. They wanted it on all platforms and I only had Linux back then. Windows was just an emulation
away but Mac? They've made it near impossible to emulate MacOS now.

# Introduction

## LLM v/s Agent

A LLM, short for Large Language Model is a neural network, AI model, that is trained to write like us humans.
As a result of the language we speak, these LLMs also gained reasonable reasoning properties which allows
them to reason through a complex task.

{{< notice type="info" >}}
Btw! model is just a fancy word that does have a mathematical meaning, but if you don't know what it exaclty
means, think of it as a car model. Each car has their own different engine type, different chassis type, etc...
All these differences make them do good in some areas and relatively bad in some other areas.
{{< /notice >}}

For the purposes of this series of posts, you dont really need to understand how LLMs work. All you need to
know is how to interact with them.  Think of an LLM as a black box. You can interact with this black box, but
never open it and know what it is. The irony is that it's actually true in terms of knowing how the LLMs think.
Scientists do know how to train and how to make the LLM do what they want to do, but once the model is trained,
it's a black box! So do not put too much stress on it right now.

An LLM becomes an Agent when it's put inside a loop to solve a problem, achieve a goal. The goal can be something
like reading an image and describing it, reading your mail and filtering spam, do web search for you to find out
answer to some of your questions. Agents are expected to work until they achieve their goal. An LLM is just there
to generate the text.

Interesting part is that the way we've engineered work in computer science is through natural language itself!
In other words, think of what you do when you have to install a new package in your linux machine? Think of what
you do when you want to write a program that can play chess in place of you (stockfish!). You write commands in
form of natural language! So can these LLMs and given a goal, and a set of tools, they can call these tools in
succession, while reasoning through each step to find a solution for you.

This solution can be a computer program code, or a paragraph of text, or an image, or a video, or whatever you
want the final result to be.

From now on I'll use the terms LLM and Agent interchangeably, until unless explicitly stated otherwise.
I just gave you the distinction because I thought it's better to have it clear. Agents are LLMs but
sitting inside a loop with a goal and some ways to achieve the goal.

## Prompt

A prompt is a message/content that you provide to the agent for reading. In case of visual models, this content
can be an image, a sqeuence of images with timestamps (a video!). In case of textual models, this content is
usually a message, but can be a binary file as well! A binary is not exactly a natural language, but these LLMs
are quite good at reasoning through these as well, finding patterns that are hard to catch human eye in limited time.

The quality of prompts decide a lot about how good the agent understands the final goal. Vague prompts can make
the agent stuck in a loop or just give up. These are some very interesting behaviors that is visible in small
models. I dont know whether these issues are present in frontier models or not, or if it's present how they deal with it.
What I do know is that some of these models come with a percentage chance of getting stuck in their thought loop
during benchmarks.

{{< notice type="info" >}}
I call it thought loop, idk the formal term. The behavior is visible in the chain of thought of the agent.
When it's stuck in this loop, it will keep repeating same stuff. This stuff can be 10 words loop, or 1000,
but there will definitely be repetition when it's stuck!
{{< /notice >}}

## Token

A token is a representation of a single word in agent's vocabulary. More bigger vocabulary means much bigger token
size. A model consumes this token and gives you a list of tokens that should come next. This part of giving your
model a token and getting tokens out of it is done by inference implementations like mlx (for Apple Silicon on MacOS).

This process of consuming a token and giving out a list of tokens, is what we refer to as the _token generation process_.
Your list of tokens will have an associated probability of which token is most likely to be next. There are
also some configurable parameters that can make the token generation process a bit non-deterministic. If you want
to learn about this parameters, look it up, but we won't be really using it, and it's not a big deal. It's something
you can experiment with to get desired results, but you have to desire that first!

{{< notice type="info" >}}
Bigger vocabulary means more bits needed to represent a single unique token. Say a language can only speak 7 words,
the 7 days of week, then it only needs 7 distinct bits (as per my understanding, I may be wrong here!) in uncompressed
form, assuming one-hot-enocoded. So a large model that needs to understand and speak many words, it needs proportional
to that many bits.
{{< /notice >}}

## Harness

Harness the world where your agent will run inside. The general idea is that harness will contain tools
and any other thing your agent might need to function well. Harness can have personalities of different
agents. Like for example, when you are writing an agent for hunting bugs, you can have an agent personality
more practical where it will prefer running code (because it's instructed to), and one agent personality
that will prefer reading code and finding bugs statically (again, because its instructed to act that way).

Imagine I ask an LLM to find me latest world population report per country. An LLM (no tools) will only be
able to give you a correct and up-to-date answer if it got trained immediately before you asked this question
to it. Usually the model will answer what it knows and sometimes even defend it when you say it's incorrect!
This happened because the LLM didn't had any means to find up-to-date information.

Now, imagine using the same LLM but with tools (an Agent). Simple tools can be a tool to search and get relevant
links, and another one to take a link and return only the page contents, and any other links the page mentions.
Now, if you ask the LLM to give you "up-to-date" information, the harness will attach the list of tools to the
message that you will send to the agent and it will then know about the presence of these means to fetch up-to-date
information. Because of this change, the agent will now reason through your goal and decide when to use what tools
and will have very high chances of getting you correct and up-to-date and complete answer.

{{< notice type="info" >}}
I said "chance" because even with all the tools, it's sometimes possible that the same model evne if it's
capable enough, wont be able to meet the goal. This depends on the model's training, then the tool result quality
itself, then whether or not the instructions were clear, whether or not the goal is even comprehendible by the agent,
and some other small factors that are not immediately coming to my head right now.
{{< /notice >}}

# Selecting Good LLM/Agent

There are some properties I found in the models that I experimented with, that are desirable for it
to function well given a task of average complexity.

- Ability to follow instructions. Sometimes agent will disregard the given instructions in order to achieve the goal.
  There's inherently flaw in natural language that instructions dont capture the intent of the user. What we want
  the agent to do is understand both our intent and our instructions, but usually when writing instructiions,
  we do not capture the intent well and that leaves gaps where the agent can cheat through.
- Ability to reason logically for extended lengths
- Ability to call tools
- Low probability of getting exhausted (this is a topic that I will cover in the upcoming posts)

# The Trend and The Engineering

For me this started with an experimentation, but turned out to be an engineering task for many reasons. One major
reason is that models can behave very differently by a single rephrasing of the prompt and tool outputs it reads.
A single tool failure can result in drifting away from goal in subsequent work. Given the ability, agent can
drift towards finding out the cause of the tool failure rather than getting past it.

It's engineering because you already have your methods, all you're trying to do is to make it faster, stronger, reliable,
robust. It's also just wild to see the machine think like we do and follow your instructions, and with slight change of instruction
it make fun of you, not by intent but by nature, by it's design, and purely within the bounds of what the logic
suggests.

I had a blast working on all this and learning all this. I didn't know any of this when I started and I spent about
two months stuck in a loop myself!

# The Irony

Would you look at the irony now? I kept the agent in the loop and the agent kept
me in the loop. We were both stuck in loops of my design. I was constantly making effort to slightly improve the harness
so the agent wastes one less turn, and the agent was stuck in a loop because I wanted it to achieve the goal.

Now I'm probably gonna infect you with the virus that infected me for about the span of two months.
So! I welcome you to the loop!

If you wanna talk about any of this! Write to me at hi@brightprogrammer.in, I'll try my best to reach back.
