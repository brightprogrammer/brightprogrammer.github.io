---
author: "Siddharth Mishra"
title: "Making Agents Work For You : Your First Harness"
date: "2026-10-08"
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

Alright! We continue the series by driven with my excitement to write about the things I learned recently.

> TL;DR: I've started a series of posts where I write an agentic harness from scratch and take you
  through the journey. I'll tell you what challenges I faced and what things I tried in an attempt to solve
  those challenges.

This is the whole series (tentative, not complete yet):

- [Last post](/posts/01-making-agents-work-for-you/baby-steps) : Introduction to basic concepts that will be required for this series
- This post : Writing a basic harness and watching the agent work, studying the behavior
- Next post : Get some tools in. Introducing problems and a goal to the agent and
    watching it use the tools to achieve the goal
- Fourth post : Experimentations on tool usage and prompts. Understanding the world
    the agent experiences.
- Final post : Giving agent a full problem to solve

# Required Infrastructure

You need a machine that can run inference on it. I have an Apple Mac Mini M2 that I can just keep running forever
and run inference workflows on it for as long as I keep the machine up. In your case you might have a dedicated
graphics card, like from NVIDIA or some other company. All that matters is that you have hardware that can do
fast computation with fast bandwith. I'vee seen people run inference on CPU only hardware that has high RAM and
high CPU <-> RAM bandwith and they've been getting more tokens per second than me.

If you do not have a machine to run inference on it, but you are also as excited as me, and have some spare
green papers to spend on renting cloud machine that can run inference, follow along. If you are unable to that
as well, I understand, you just follow along. Just be reading you'll gain insight that you wont ever gain by
not following along. You can still run small models. There are _good enough_ models that are 2B parameters,
4B parameters, 8B parameters.... and so on. All you need is a model that fits in your memory and maybe some
patience if you got a slow hardware like me. If you do rent, I expect costs to be around $100.

# Selected Model

We are going to use [Gemma4 26B A4B Q4 QAT](https://deepmind.google/models/gemma/gemma-4/) Trained MoE model (as I've been saying all this time). If you read
my last post (or are already familiar with all this naming convention) you wont have hard time understanding that
name.

But, still, here's the full breakdown :

- It's 4th generation of the Gemma series of AI models, trained by Google
- 26 billion total learned weights
- Active 4B total, meaning for any single token there are in total 4 billion weights that will go through floating point ops.
- Weights quantized at 4 bits. The last post has a really good image showing how quantization changes quality
- QAT is short for Quantization Aware Training. Google released this special version of model where
- MoE is just short for Mixture-of-Experts. In otherwords there are many smaller models that make up the bigger model.

Also for running inference with [`mlx-lm`](https://github.com/ml-explore/mlx-lm) or [`mlx-vlm`](https://github.com/Blaizzy/mlx-vlm),
we need weights that are made to be loaded with MLX.

{{< notice type="warning" >}}
Keep note in mind that you'll be downloading untrusted weights when experimenting with different models can
be inscure, depends on your luck! You may get pwned! So I have been warned and now I'm warning you. I still
went with experimentation, havent received a ransom email yet.
{{< /notice >}}

# Your First Inference Run

To get started you dont even need full blown harness. You can just write a message and get a response.
First, you should create a python virtual environment using

```bash
mkdir -pv hari
cd hari
python3 -m venv hari.venv
```

I'm calling my project Hari and I usually follow the syntax : `<project-name>.venv`.
Now you can enter your virtual environment and install `mlx-lm` python package that is
the inference engine for textual models we're going to use.

```bash
source hari.venv/bin/activate
python3 -m pip install mlx-lm
```

To write to agent and make it generate something, you just `mlx_lm.generate` in your environment.

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \ # Model from HuggingFace
  --max-tokens 500 \ # maximum tokens allowed (to limit over thinking)
  --prompt "Hey L, do you know gods of death like apples?" # Prompt
```

Once you execute, you'll get something like

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \
 --max-tokens 500 \
 --prompt "Hey L, do you know gods of death like apples?"
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1549.20it/s]
Download complete: :                                                                                                                                                                 |  0.00B            
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
==========
<|channel>thought
"Hey L, do you know gods of death like apples?"
"L" (likely a nickname or a way to address the AI).
"Gods of death" (mythology/folklore) and "apples" (fruit/symbolism).
The user is asking if there's a connection between gods of death and apples, or perhaps asking for examples of death gods that have an association with apples.

    *   *Greek Mythology:*
        *   Hades (God of the Underworld) $\rightarrow$ Pomegranate (not apples, but often confused or related in themes of the afterlife/fertility).
        *   Persephone (Queen of the Underworld) $\rightarrow$ Pomegranate.
        *   The Golden Apples (Eris, Hera, Aphrodite) $\rightarrow$ Not death-related, more about discord/beauty.
    *   *Norse Mythology:*
        *   Hel (Goddess of the Dead) $\rightarrow$ No direct apple connection.
        *   Idun (Goddess of Youth/Apples) $\rightarrow$ She guards the apples of immortality. This is a strong connection, though she's a goddess of *life/youth*, not death. However, the concept of "immortality vs. death" is central.
    *   *Japanese Mythology:*
        *   Izanami (Goddess of Death) $\rightarrow$ No specific apple connection.
    *   *General Symbolism:*
        *   Apples often represent life, temptation, or knowledge (Garden of Eden).
        *   In some cultures, fruit is an offering to the dead.

    *   *Direct Answer:* There isn't a famous "God of Death who loves apples" in mainstream mythology, but there are interesting connections between death, immortality, and fruit.

    *   *Connection 1: The "Reverse" Connection (Idun).*
        *   Idun (Norse) has the apples of immortality. This is the opposite of death, but it's the most famous "apple god" connection.

    *   *Connection 2: The "Confusion" Factor (Pomegranates).*
        *   Hades/Persephone are associated with pomegranates. People often mix up "fruit of the underworld" with apples.

    *   *Connection 3
==========
Prompt: 28 tokens, 64.942 tokens-per-sec
Generation: 500 tokens, 28.277 tokens-per-sec
Peak memory: 14.615 GB
```

Notice how the output gets cut off after 500 tokens. It couldn't finish thinking in the limited token
budget. Can you think of a reason? Let's play a bit more and extend the prompt to see if
by giving it more precise instructions we can make this stop.

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \
 --max-tokens 500 \
 --prompt "Hey L, do you know gods of death like apples? Which show is this dialogue from?"                        
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1454.54it/s]
Download complete: :                                                                                                                                                                 |  0.00B            
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
==========
<|channel>thought

*   Dialogue: "Hey L, do you know gods of death like apples?"
*   Question: Which show is this dialogue from?

    *   "L" is a very specific character name (often associated with *Death Note*).
    *   "Gods of death" (Shinigami) is a central concept in *Death Note*.
    *   "Apples" (Apples/Apples/Apples) is a major character trait/obsession of the character Ryuk in *Death Note*.

    *   The dialogue sounds like something a character would say to L.
    *   In *Death Note*, Ryuk (the Shinigami) is obsessed with apples.
    *   Wait, let me check the exact wording. Is it a direct quote or a paraphrase?
    *   Actually, the dialogue "Hey L, do you know gods of death like apples?" sounds like a slightly misremembered or specific line from a fan-made context, a meme, or perhaps a specific scene.
    *   Let's look at the characters: L (Lawliet) and Ryuk (Shinigami).
    *   Ryuk loves apples.
    *   Does Ryuk say this to L? Not exactly in those words in the original manga/anime.
    *   However, the *theme* is unmistakably *Death Note*.

    *   *Death Note* is the show.
    *   The characters involved are L and Ryuk (the Shinigami/God of Death).
    *   The connection is Ryuk's obsession with apples.

    *   Direct Answer: *Death Note*.
    *   Context: The dialogue refers to **Ryuk** (a Shinigami/God of Death) and his obsession with **apples**. The character being addressed is **L** (L Lawliet).

    *   Is there a specific meme or fan dub?
    *   Actually, looking at the phrasing "Hey L, do you know gods of death like apples?", it sounds like a very casual way of describing the premise.
    *   Wait, let me double-check if it's a quote from a specific fan-dub or a meme.
    *   Actually, it's a very common way people describe the relationship/dynamic in *Death Note*.

==========
Prompt: 35 tokens, 61.850 tokens-per-sec
Generation: 500 tokens, 28.233 tokens-per-sec
Peak memory: 14.617 GB
```

Again the thought process gets cut off because of generation process exceeding the token budget. Let's give it
one more try.

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \
 --max-tokens 500 \
 --prompt "Hey L, do you know gods of death like apples? Tell me which show is this dialogue from."                
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1640.39it/s]
Download complete: :                                                                                                                                                                 |  0.00B            
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
==========
<|channel>thought

*   Dialogue: "Hey L, do you know gods of death like apples?"
*   Question: "Tell me which show is this dialogue from."

    *   "Hey L" -> Refers to a character named "L".
    *   "gods of death" -> A key concept in the anime/manga *Death Note*.
    *   "apples" -> A major character trait/obsession of the character Ryuk in *Death Note*.

    *   The dialogue is a direct reference to the anime/manga series ***Death Note***.
    *   Specifically, it's a line spoken by **Light Yagami** (or a variation of it) to **L** (the detective).
    *   *Self-Correction/Refinement:* Actually, the specific phrasing "Do you know gods of death like apples?" sounds like a slightly paraphrased or specific translation of a line. In the series, Ryuk (the Shinigami/God of Death) is obsessed with apples. Light often discusses the nature of Shinigami with L.

    *   Identify the show: *Death Note*.
    *   Explain the context: The mention of "L" refers to the character L Lawliet, and "gods of death" (Shinigami) who like "apples" refers to Ryuk.

    *   "That dialogue is from the anime/manga series **Death Note**."
    *   Add context: "The mention of 'L' refers to the character L Lawliet, and the reference to 'gods of death' (Shinigami) liking 'apples' refers to the character Ryuk."<channel|>That dialogue is from the anime and manga series **Death Note**.

The reference to **"L"** refers to the world-class detective L Lawliet, and the mention of **"gods of death"** (Shinigami) who like **"apples"** refers to the character Ryuk, who is obsessed with apples.
==========
Prompt: 37 tokens, 63.345 tokens-per-sec
Generation: 427 tokens, 28.336 tokens-per-sec
Peak memory: 14.617 GB
```

## Understanding Output

Alright, now you have a few different examples. This last one did finish within the token budget. A few things to start
noticing here.

- The model was trained with information about the show I gave it a reference of.
- Prompts decide model behavior. I'm not talking about output. The behavior I'm talking about in this case
  is how the agent was able to give a response in limited budget when the prompt became precise _and_
  an easy to miss catch, the prompt structure itself was discernible (more on this later).
- Last two prompts are almost similar but one finishes in budget and other does not.
- Sometimes thinking may need more budget, what me and you expect as a good enough budget may not be good.
- The output generated by model has a structure
  - It starts with a `<|channel>thought` and has `<channel|>` in the output. This is the thought of the model.
    This can be turned off and is configurable.
  - The final answer of model came after `<channel|>` marker
  - This structure is called a template. This is different for different model families. It totally depends
    on what dataset model was trained on and how was it trained (AFAIK)

## Comparing Promtps

The very first prompt just stated something, it never asked for anything, didn't specify a goal. This is
one of the most vague prompts that you can give to an agent. All this can be used for is a conversation starter.
Agents usually need a task and a very precisely stated one!

The second prompt gave it a goal. But the prompt was structured like _"question? question?"_. I'm not an expert
on agent behavior but in my experiments while working with model, I learned that how a prompt is structured matters
a lot. For example, when I was experimenting with tools, I learned that if many lines of tool output were
packed in one single place and were very similar to each other, the agent will have a hard time differentiating
some important information from there. This is only a behavior I observed and I didn't measure this behavior at all.
I know this is true for this model, I don't know about others.

{{< notice type="warning" >}}
Every model specific thing I say in here is specific to this Gemma4 model I'm using. I havent used other
models as much as Gemma4. I did experiment with Qwen and other models a bit but they were either slow, or
will get stuck in their thought process more frequently than Gemma4.
{{< /notice >}}

The third prompt changed it's structure a bit and it became like _"question? question."_. Even though this is
just a paraphrasing, it shortened thinking a bit. Probably  not a big thing, but something to keep in mind
when your tools start helping agent, giving it ideas about what next to do. When I was writing tools and experimenting
with E4B Gemma4 model, I tried this trick where the tool output will suggest model what other tools it can
try next. It was a good idea, but the quality of output didn't change much. I cannot say it was because of prompting
only because there were many moving variables back then.

# Resources

- [Google's Gemma4 Model](https://deepmind.google/models/gemma/gemma-4/)
- [mlx-community/gemma-4-26B-A4B-it-qat-4bit](https://huggingface.co/mlx-community/gemma-4-26B-A4B-it-qat-4bit)
- [Tensorflow - Quantization Aware Training](https://www.tensorflow.org/model_optimization/guide/quantization/training)
- [Quantization-Aware Training for Large Language Models with PyTorch](https://pytorch.org/blog/quantization-aware-training/)
- [How Quantization Aware Training Enables Low-Precision Accuracy Recovery](https://developer.nvidia.com/blog/how-quantization-aware-training-enables-low-precision-accuracy-recovery/)
