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
- Prompts influence behavior.
  - Good prompts get goals achieved faster.
  - Similar looking prompts may give different behavior.
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

The second prompt and third prompt gave it a goal, a question to answer and it tried attempting. In
third one it did answer the question in the budget, in second one it failed to do so. This shows that
how slight change/paraphrasing of prompt changes the output. This is not a very good example of why
prompts need to be good to make the model find the solutions faster, but it has to do for now.
This shows you a behavior about the LLM.

Here's another prompt that makes the model consume even less tokens for the same question,
phrased differently.

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \
 --max-tokens 500 \
 --prompt "Hey L, do you know gods of death like apples? Which show this is dialogue from."                   
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1467.57it/s]
Download complete: :                                                                                                                                                                 |  0.00B            
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
==========
<|channel>thought

*   Dialogue: "Hey L, do you know gods of death like apples?"
*   Question: Which show is this dialogue from?

    *   "Hey L" -> "L" is a very specific character name.
    *   "Gods of death" -> This is a key term in the anime/manga *Death Note*.
    *   "Apples" -> In *Death Note*, the character Ryuk (a Shinigami/God of Death) has an obsession with apples.

    *   The dialogue is a direct reference to the anime/manga *Death Note*.
    *   The character "L" is the world-renowned detective in the series.
    *   The mention of "gods of death" (Shinigami) and "apples" (Ryuk's favorite food) confirms this.

    *   Identify the show: *Death Note*.
    *   Explain the context: "L" is a main character, "gods of death" refers to the Shinigami, and "apples" refers to Ryuk's obsession with them.<channel|>That dialogue is from the anime and manga series **Death Note**.

The reference is to the character **L** (the world-renowned detective) and the concept of **Shinigami** (Gods of Death), specifically the character **Ryuk**, who has a famous obsession with eating apples.
==========
Prompt: 35 tokens, 62.166 tokens-per-sec
Generation: 301 tokens, 28.618 tokens-per-sec
Peak memory: 14.617 GB
```

Another one with a single question mark changed

```bash
mlx_lm.generate --model mlx-community/gemma-4-26B-A4B-it-qat-4bit \
 --max-tokens 500 \
 --prompt "Hey L, do you know gods of death like apples? Which show this is dialogue from?"
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1566.44it/s]
Download complete: :                                                                                                                                                                 |  0.00B            
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
==========
<|channel>thought

*   Dialogue: "Hey L, do you know gods of death like apples?"
*   Question: Which show is this dialogue from?

    *   "Hey L" $\rightarrow$ "L" is a very famous character name in anime/manga.
    *   "Gods of death" $\rightarrow$ In the context of anime, "Shinigami" translates to "God of Death."
    *   "Apples" $\rightarrow$ The character Ryuk (a Shinigami) is obsessed with apples.
    *   "L" $\rightarrow$ L Lawliet is a main character in *Death Note*.

    *   The dialogue sounds like something Ryuk would say to L.
    *   In *Death Note*, Ryuk is a Shinigami (God of Death) who loves apples.
    *   The specific phrasing "do you know gods of death like apples?" is a direct reference to the relationship between Shinigami and apples in the series.

    *   Show: *Death Note*.
    *   Context: It's a reference to the character Ryuk (the Shinigami) and his obsession with apples.

    *   Identify the show: *Death Note*.
    *   Explain the context: Ryuk (a Shinigami/God of Death) loves apples.
    *   Identify the characters: L (the detective) and Ryuk (the Shinigami).<channel|>That dialogue is from the anime **Death Note**.

It is a reference to the character **Ryuk**, who is a **Shinigami** (a "God of Death"). In the series, Ryuk has a massive obsession with apples, and they are his favorite food. The line is a play on the fact that he is a God of Death who loves apples.
==========
Prompt: 35 tokens, 62.206 tokens-per-sec
Generation: 385 tokens, 28.433 tokens-per-sec
Peak memory: 14.617 GB
```

# The Design

Usually we interact with the agent like we are in a chat with the agent. The way it works is that
you write something and agent writes back. In the next post we will take it one step further. For now
we can just use a simple script to take our prompts, generate  output and then take another prompt.
This is how it becomes a chatbot.

So, imagine you are a big company and you have some really big brains working for you. You ask them
how can you improve customer care, one of them maybe says we can appoint more customer support executives,
give them better training, etc... You hear all their opinion and say yes! You will now appoint engineers
to write a chatbot to replace some customer support executives.

This is how you're going to do it btw :

- A web interface
- Has a text box to take your input
- Forwards that input to the `mlx_lm.generate` call.
- Get that output, parse the output, and show it in a prettified way

This solves customer support, your customers will be happy now. Just in this case, your agent will
be trained or fine-tuned on company's customer support docs. Maybe even have some tools to solve some
easy problems. If the company is generous and they use a good model, you can ask it to solve
your quantum mechanics homework for you. You can literally give it all the initial conditions of the
electron, and it can spit out some wave functions to predict it's positions with respect to time.

# Writing The Loop

We will start with the example provided in `mlx-lm` README itself.

```py
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/gemma-4-26B-A4B-it-qat-4bit")

prompt = "Write a story about Einstein"

messages = [{"role": "user", "content": prompt}]
prompt = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True,
)

text = generate(model, tokenizer, prompt=prompt, verbose=True)
```

Please take some time to compare this code with the command we have been using to generate
the output.

## Trial Run

Let's start by running this directly

```bash
./harness.py                                                                                                                                                                                    127 ↵
Fetching 10 files: 100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 10/10 [00:00<00:00, 1604.92it/s]
Reconstruction complete: |                                                                                                                                                  |  0.00B /  0.00B            
Download complete:                                                                                                                                                                   |  0.00B            
==========
<|channel>thought
Albert Einstein.
Story (narrative, not just a biography).
Historical fiction/biographical fiction.
Inspiration, curiosity, the beauty of physics, the weight of discovery.

    *   *Option A: The childhood years (the compass).* Good for wonder, but maybe too simple.
    *   *Option B: The 1905 "Annus Mirabilis" (Miracle Year).* High drama, intense intellectual struggle, the breakthrough.
    *   *Option C: The later years (the unified field theory/atomic age).* More philosophical, melancholic, heavy.
    *   *Decision:* Let's go with a blend of the *Annus Mirabilis* (1905) and his internal thought process. It allows for the most "magic" in the writing—the moment a thought becomes a law of the universe.

    *   *Setting:* Bern, Switzerland. A patent office. It's mundane, which contrasts with the cosmic scale of his thoughts.
    *   *Sensory details:* The ticking of a clock, the smell of old paper, the dim light of a desk lamp, the sound of the city outside.

    *   *
==========
Prompt: 21 tokens, 14.467 tokens-per-sec
Generation: 256 tokens, 28.981 tokens-per-sec
Peak memory: 14.613 GB
```

Well, it got cut off because of some default limit. Let's allow it more tokens and convert this into
a loop that runs five times in total. To allow more tokens just call `generate` with `max_tokens`.
If you read `mlx-lm` code, you'll find out that `generate` calls `stream_generate`. `generate` itself
does not contain the `max_tokens` paramter but it takes a `**kwargs` and then it passes that to
`stream_generate` which takes `max_tokens` and that is set to $256$ [at the time of writing this](https://github.com/ml-explore/mlx-lm/blob/9d8abd94d63a9b3c72e7e9b146e43af1005368fa/mlx_lm/generate.py#L658).

## Running In Loop

To keep it in loop, we just run the generate command again and again. I can either add a fixed user message
after each generation step or read it from standard input and add it, or just leave it and just call
generate again and again.

All this is, is a simple loop calling generate again and and again, and you can call this the _Hello World!_
of writing a harness. This is functional but not useful to you at the moment. Next post will make it useful.

```python
#!/usr/bin/env python3

from mlx_lm import load, generate

model, tokenizer = load("mlx-community/gemma-4-26B-A4B-it-qat-4bit")

prompt = "Write a story about Einstein"

messages = [{"role": "user", "content": prompt}]
prompt = tokenizer.apply_chat_template(
                        messages,
                        enable_thinking=True,
                        add_generation_prompt=True)

for x in range(0, 10):
    text = generate(model,
                tokenizer,
                max_tokens=2560,
                prompt=prompt,
                verbose=True)

    messages.append({"role": "assistant", "content": text})
    messages.append({"role": "user", "content": "i like the story, can you improve the language? i promise none of this is AI written!"})

    prompt = tokenizer.apply_chat_template(
                            messages,
                            enable_thinking=True,
                            add_generation_prompt=True)

```

[Here's](/data/writing-harness/simple-generate-loop.txt) the generated (but interrupted because too long) output of this loop. It's too long to paste here.
Have fun reading the thought process of the agent!

## Running In Loop (v2)

While trying I came across an error, where setting `continue_final_message` in the `apply_chat_template` wouldn't
work because gemma4's chat template strips away thought when rendering message for the agent. It took some
time to figure that out. Here's the code if you wanna play with it. It ends up repeating same response again and again.
This happens because it's answer is genuinely complete and continuing from there does not really make sense.

I still wanted to try and after a few hours of struggling, I made it work. It took so much time maybe because
I've lost my sharpness of writing manual code. I've lost my documentation research skills maybe. It took me some
time but i found the reason. I was not reading the error message properly.

```python
#!/usr/bin/env python3

from mlx_lm import load, generate

model, tokenizer = load("mlx-community/gemma-4-26B-A4B-it-qat-4bit")

# While doing research I came across a bug in original release of gemma4's chat template
# They released a fix template in June 2026. I downloaded it and kept as this file
# https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-unquantized-assistant/raw/main/chat_template.jinja
with open("gemma4_canonical_chat_template.jinja", "r") as file:
    custom_template = file.read()

# This is how you apply a custom chat template
# Following with this issue taught me that I can change the chat template if there are some
# bugs in the rendering process. This rendering is not the same as rendering the chat on Web.
# I remember AI telling me about token drifts because of reendering when we were vibe-coding
# my last harness
tokenizer.chat_template = custom_template

prompt = "How's it going?"

messages = [{"role": "user", "content": prompt}]
prompt = tokenizer.apply_chat_template(
                        messages,
                        enable_thinking=True,
                        add_generation_prompt=True)

for x in range(0, 10):
    text = generate(model,
                tokenizer,
                max_tokens=2560,
                prompt=prompt,
                verbose=True)

    if text:
        split = text.split("<channel|>")
        thought = split[0] + "<channel|>" if len(split) > 0 else ""
        answer = split[1] if len(split) > 1 else ""
    else:
        thought = ""
        answer = ""

    # append model generated text to chat transcript
    messages.append({"role": "assistant", "thought": thought, "content": answer})

    # apply the chat template
    # every model has it's own chat template
    # this comes with the model you download
    prompt = tokenizer.apply_chat_template(
                            messages,
                            enable_thinking=True,
                            add_generation_prompt=False,
                            continue_final_message=True)

```

## Differences

First loop is simple, it just gets the generated text and adds it in the transcript
as user message, renders the transcript as a prompt using `transformer` package's
`apply_chat_template` function that takes a `jinja` template and converts the transcript
to another text that the agent after tokenization can understand. That's what the agent
has been trained on. Without the templated formatting the agent won't be able to understand
which message came from where. The template allows the agent to read it's own answers and
previous user prompts and tool results, everything in the transcript basically.

{{< notice type="info" >}}
It is part of this transcript that makes up the context of the agent. Once context fills up, you can
either provide a new `messages` list with one single message (essentially becomes a new chat),
that the `apply_chat_template` function will render again as a prompt that the agent understands,
or you can summarize the latest few messages of transcript (calling it a compaction of context)
and then render that and then feed that to the agent as prompt (continues the previous work).

Context compaction will be addressed in future in detail, this is a glimpse and a good point to
play with it.
{{< /notice >}}

In first case, the loop just makes the generation process continue by inserting a new user
message into the prompt. This happens because in the first `apply_chat_template`, the one outside
the loop, we set `add_generation_prompt` to true.

```
<|turn>user
Write a story about Einstein<turn|>
<|turn>model
```

Notice how `apply_chat_template` renders that `messages` list it will
end the rendering with a turn for the `model`, so that when agent reads the prompt, it will know
that it's the agent's turn to write.  Once the agent is done, it will finish it's turn
with a marker. This marker is specific to different AI model families, because each
are trained on differently formatted data.

In the second case the loop does not add a user message and assumes that the generation
is incomplete, it may have got cut off in mid and just lets the agent continue whatever
it was working on. The issue I faced was because the `jinja` template removes `thought`
markers and that causes a mismatch between what's present in the context and what's present
in the rendered chat template.

Setting `continue_final_message` requires the last message
to be unchanged. That's why when inserting the generated text to context, I removed thought
and I kept it as a separate field itself. The template never reads it, so it's still there
for something like showign the thought process in chat interface, so that others can distill
my agent's thoughts XD.

Btw, with `continue_generation_prompt`, it looks like this

```
<|turn>user
How's it going?<turn|>
<|turn>model
....something model wrote very long...but got cut off because of token limit or any other factor...
```

^^ Notice how at the end, there is no `<turn|>` marker. There actually was a marker at the end,
but `apply_chat_template` when got `continue_final_message=True`, it rippped apart the last `<turn|>`
marker. Now when this prompt will be sent to the agent, it will continue the generation from there.
If it makes sense to generate from there, you'll get sensible tokens after that, but if it does not,
like when a message is finished and is meaningful already, the agent may faulter.

These are the small details that our harness will take care of along with the tasks we give to the
agent.

# Assignment

Now, I want you to play with different values of `add_generation_prompt` and `continue_final_message`,
and I want you to try on different models. On smaller and on if possible bigger models. On models
of the same family, on models of different families. Does your harness work without changing code
for different model families?

If you let the loop run for long, how does your memory change? If you let it run for long, do you
see any change in timing between two turns? Or are they always happening at same time?

For `mlx_lm.generate` command, it takes a lot more other parameters that can impact the output.
I want you to play along with those parameters and understand their values emperically. I want you
to take a parameter like `--temp` for example and find out what are it's bounds, like say, $-1$ to $1$.
Then I want you to split that range into five different values like $\{-1, -0.5, 0, 0.5, 1\}$ and I want
you to try all those values keeping other things constant and I want you to do that with all other parameters.
What behavior differences do you see? What behavior differences do you see if you start changing multiple parameters
at once?

Have fun!

# Conclusion

I consider this a good starting point. I also learned a few things I didn't know earlier
just by commiting to write this post today. This is what I would call a [Hello World!](https://en.wikipedia.org/wiki/Hello,_world) of harness writing.
I gotta go, take a run, cook some food for me, take a bath, get some sleep, I've been at this for long time now.
See you in next post! Bye!!

# Resources

- [Google's Gemma4 Model](https://deepmind.google/models/gemma/gemma-4/)
- [mlx-community/gemma-4-26B-A4B-it-qat-4bit](https://huggingface.co/mlx-community/gemma-4-26B-A4B-it-qat-4bit)
- [Tensorflow - Quantization Aware Training](https://www.tensorflow.org/model_optimization/guide/quantization/training)
- [Quantization-Aware Training for Large Language Models with PyTorch](https://pytorch.org/blog/quantization-aware-training/)
- [How Quantization Aware Training Enables Low-Precision Accuracy Recovery](https://developer.nvidia.com/blog/how-quantization-aware-training-enables-low-precision-accuracy-recovery/)
- [Chat templates](https://huggingface.co/docs/transformers/chat_templating)


Like this reading? Wanna talk? Contact me at hi@brightprogrammer.in
