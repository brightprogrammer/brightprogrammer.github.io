---
author: "Siddharth Mishra"
title: "Making Agents Work For You : Tool Calling"
date: "2026-10-12"
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

[Last time](https://brightprogrammer.in/posts/02-making-agents-work-for-you/baby-harness/) we wrote our first [Hello World!](https://en.wikipedia.org/wiki/Hello,_world) harness which was very simple but sufficient enough to experiment with.
We just had a loop call `generate` on prompt we pass. We saw how we can enable disable thoughts of agent. We saw how
we can make the agent continue it's turn even if it's already done, we also saw how we can insert user prompts in
between the agent's turn so it basically works like a chat.

All of that was primitive to build an agent that can take a message from user and do tool calls to complete requests.
Imagine a case where I want a news brief every morning at 8 AM. I can have a cron job running that tells the agent
(using some way my harness will allow) to get my news feed, find out new things that happened between yesterday morning
and today morning and summarize that in order of importance. The agent will read, summarize and prepare a news summary
for me and then I can pass it to a text-to-speech model to narrate it to me.

There are few risks of doing this as well. Everything your model reads is untrusted source. If someone were to know your
workflow that you use agents to get news summary, and that certain _someone_ got not so nobel intents towards you, they
can try to sneak into your news feed (shouldn't be too hard), and make your agent read some text that sounds like an
instruction from you. This is the basic idea of prompt injection. This untrusted code can instruct your agent to do some
malicious operations, given your agent is allowed tool calls. Even something like a search tool, depending on how it's
implemented can lead to command injection attack and basically code execution on your host where commands are getting
executed. It's not necessary to run the inference and the commands on the same machine. These can be on two different
machines at two different locations.

> TL;DR: I'm writing a series on how to make your own agentic harness around local models that works specific
  to your use case. This is the third part in the series. We've already gone through basic fundamental jargons
  and wrote a basic _Hello World!_ harness using a locall Gemma4 26B A4B QAT MoE model.

This is the whole series (tentative, not complete yet):

- [First post](/posts/01-making-agents-work-for-you/baby-steps/) : Introduced basic jargons that we need to be familiar with to get started. I also talked about my motivation of why I thought it's a good idea to write a harness
- [Last post](/posts/02-making-agents-work-for-you/baby-harness/) : Wrote a basic _Hello World!_ harness. It just calls `generate` in a loop a certain number of times.
- This post : We will give agent some tools and some tasks and we will watch it achieve and fail those tasks.
- Next post : Improving tools and prompts, maybe adding more tools?
- Final post : Watching it complete complex tasks. I'm still planning on this one. I'm thinking of implementing a recent paper, and I already have it selected.

# Agentic Tools

Agents are trained to output the tool calls they expect
in a parseable format. It has a very specific syntax that
names the tool it wants to run, names the arguments and
passes the values of arguments. But, how does the agent
know what tools to call and how to use these tools? We
tell the agent about it, simple, and we'll see that in
a moment.

{{< notice type="info" >}}
TL;DR: The tools are a set of

- functions names, and
- a short description, and
- what paramters it takes, and a description for each

The agent using it's reasoning, understands what it needs
to do next and calls a tool by it's name and arguments and
values. The output is mostly in a parseable format. The harness
parses it and attaches the tool output to the chat.
{{< /notice >}}

{{< notice type="tip" >}}
In all this, the chat template, `apply_chat_template`, plays
a vital role. I've struggled with poor chat template and poor
model output quality a lot.

- Chat template can sometimes cut off parts of generated text
  that causes a re-prefill, and depending on the context size,
  it can take more than four minutes on my machine!
- If the model outputs a tool call that is hard to parse,
  chat template may fail.

I haven't really tried getting past the chat template, but I
have a few ideas that I wanna try for the first time in this
series.

- First, I wanna try modifying the chat template itself
- Second, I wanna remove chat template completely and handle
  the parsing and generation part in the harness, in an attempt
  to recover from bad tool call more elegantly.
{{< /notice >}}

We begin with the a simple script again. This is based
on the script we used [last time](/posts/02-making-agents-work-for-you/baby-harness).
Can we call this an agent?

```py
#!/usr/bin/env python3

from mlx_lm import load, generate
from datetime import datetime

# get_json_schema takes a python function, get's it's doc strings
# and prepares a json schema that tools parameter of apply_chat_template accepts
from transformers.utils import get_json_schema


# this is the tool to get time!
# the agent will be told about this name
# and parameters (though none exist)
def cur_time():
    """
    Get current date and time
    """
    return str(datetime.now())


model, tokenizer = load("mlx-community/gemma-4-26B-A4B-it-qat-4bit")

prompt = "What's the current time?"

messages = [{"role": "user", "content": prompt}]
prompt = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True, tools=[get_json_schema(x) for x in [cur_time]]
)

# get_json_schema(cur_time) will generate
# {'type': 'function', 'function': {'name': 'cur_time', 'description': 'Get current date and time', 'parameters': {'type': 'object', 'properties': {}}}}

text = generate(model, tokenizer, max_tokens=2560, prompt=prompt)

print(text)
```

Btw, before looking at the output of that script, can you guess whether the
agent will succeed or not in answering the current time.

{{< notice type="tip" >}}
__Hint__: Recall from [the last post](/posts/02-making-agents-work-for-you/baby-harness.md) that we called generate again and again in a loop. Why would I even show you that? Because I want to show you how the agent can keep telling us current time? No!
{{< /notice >}}

```
<|channel>thought
The user is asking for the current time. I should use the `cur_time` tool
to get this information.<channel|><|tool_call>call:cur_time{}<tool_call|>
```

This is what I've been telling you about, look at the `tool_call` channel.

```
<|tool_call>call:cur_time{}<tool_call|>
```

This is what agent was told to generate that output

```
<|channel>thought
The user is asking for the current time. I should use the `cur_time` tool to
get this information.<channel|><|tool_call>call:cur_time{}<tool_call|>
<bos><|turn>system
<|think|>
<|tool>declaration:cur_time{description:<|"|>Get current date and time<|"|>,
parameters:{type:<|"|>OBJECT<|"|>}}<tool|><turn|>
<|turn>user
What's the current time?<turn|>
<|turn>model
```

First the system prompt, telling the agent about tools, then the user turn
asking the agent a question (a goal), and an opened up model turn, that the
model will begin with, generating the next and next and next tokens...

Did the agent give me an answer? Yes but no. I didn't want a tool call, I wanted
a time answer. Here's where the harness comes in. Harness will parse the tool
call and paste the tool output that the agent will read and generate a response.

## Horizon

There comes a concept of [_horizon_] when it comes to agentic
harnesses. For our case, we won't be wrong to say that there is
no horizon basically, because we constrianed it to generate
a response in one action or just fail. How long a horizon is
depends on how long you allow the agent to work on a single task,
and how long a horizon is should intuitively depend on the task.

For example, in case of an agent that summarizes email, the horizon
will depend on the _number of new mails_ the agent has to read. In case
of bug hunting, the agent just _runs forever_. First case is a long horizon,
second I could call an _infinite horizon_ agent.

## Parsing Tool Calls

mlx-lm comes with some tool calling parsers already for the models it supports.
We will just use that. We will just do `from mlx_lm.tool_parsers import gemma4`
and then to get tool calls in a `generate`-d turn, we will call `gemma4.parse_tool_call(text)`
over the `generate` returned text.

Doing that will give us

```
{'name': 'cur_time', 'arguments': {}}  
```

{{< notice type="tip" >}}
I have never seen Gemma4 emit more than one tool call in a single turn, but I've
seen this in Qwen 3.8. It depends on the model.
{{< /notice >}}

## Understanding Tool Response Format

While inserting tool response, I used this code, which turns out to be wrong.
I'm including this in hopes that it will build aptitude for debugging your harness
on your own, rather than thinking LLM running machinery as complete black box.

```py
.
.
.

# parse the tool calls and make the took call and append output
tool_calls = gemma4.parse_tool_call(text)
tool_calls = [tool_calls] if isinstance(tool_calls, dict) else tool_calls
messages.extend(
    {"role": "tool", "content": TOOLS[tool["name"]](**tool["arguments"])}
    for tool in tool_calls
)

.
.
.
```

For debugging I looked into [the `jinja` template](/data/writing-harness/gemma4_canonical_chat_template.jinja) and
didn't took long to find the answer I was looking for. I specifically had these questions in mind
before I started looking :

- How does the template expect the tool results to be handed over to it? A simple grep of "tool" keyword
  and iteration over all occurences lead me to this
- Once I get how the template expects the data to be present, how is it serializing the data?
- How is this code that serializes tool results invoked in template

I first got this as my answer to first question

```jinja
{%- macro format_tool_response_block(tool_name, response) -%}
    {{- '<|tool_response>' -}}
    {%- if response is mapping -%}
        {{- 'response:' + tool_name + '{' -}}
        {%- for key, value in response | dictsort -%}
            {{- key -}}:{{- format_argument(value, escape_keys=False) -}}
            {%- if not loop.last %},{% endif -%}
        {%- endfor -%}
        {{- '}' -}}
    {%- else -%}
        {{- 'response:' + tool_name + '{value:' + format_argument(response, escape_keys=False) + '}' -}}
    {%- endif -%}
    {{- '<tool_response|>' -}}
{%- endmacro -%}
```

Someone with enough programming exposure can losely understand this without significant effort.
So to answer my second question, my understanding is this :

- It starts a new `tool_response` channel in the serialized prompt
- If the response is
  - a dictionary (key-value pairs) it will iterate over all `key, value` pairs in `response`
    in sorted order
    - For every `key, value` pair it will print the key and the output of `format_argument` called over `value`.
      `format_argument` is another macro in the template that recursively serializes arguments in dictionary
  - not a dictionary it will directly print the response calling `format_argument` on `response`
- Will end the `tool_response` channel in the end

And to answer my third question, there are two places it's invoked. Here's the first place
and this is what I needed to read :

```jinja
{%- if message.get('tool_responses') -%}
  {#- Legacy: tool_responses embedded on the assistant message (Google/Gemma native) -#}
  {%- for tool_response in message.get('tool_responses') -%}
      {{- format_tool_response_block(tool_response['name'] | default('unknown', true), tool_response['response']) -}}
      {%- set ns_tr_out.flag = true -%}
      {%- set ns.prev_message_type = 'tool_response' -%}
  {%- endfor -%}
... elif case ...
```

This frames the whole picture for me. I can see that `format_tool_response_block` is the one
responsible for serializing a single tool call result, and this code is invoking it in a `for`-loop
itself. This must mean that this template expects the tool responses to be handed over as a json object
containing a single json array of json objects. Each object containing tool response of a single tool. Each object in top-level
array will contain a `name` key that will contain the name of the tool as value, and a `response` key
that can be another json object or a simple value. This whole json array will be keyed with `tool_responses`.

```json
{'tool_responses': [{'name': 'cur_time', 'response': 'go figure'}, {another similar object}, {and another one}]}
```

{{< notice type="note" >}}
The above jinja template expects the tool responses to appear in `model` or `assistant` role in `messages`.
There's also another `elif` case I skipped over that expects a different JSON schema. A good thing to take a look over.
{{< /notice >}}

## Attaching Tool Response

Now we can attach the tool response in a format the template will understand and will
serialize correctly.

```py
#!/usr/bin/env python3

from mlx_lm import load, generate
from mlx_lm.tool_parsers import gemma4
from datetime import datetime
from transformers.utils import get_json_schema
import os

# Tell mlx to not look for model online every single time
os.environ["HF_HUB_OFFLINE"] = "1"


def cur_time():
    """
    Get current date and time
    """
    return str(datetime.now())


# we will extend this in future
# we call this tool registry, where a mapping from tool name to tool exector exists
# using this we can make the tool call mechanism easy for us
TOOLS = {"cur_time": cur_time}

model, tokenizer = load("mlx-community/gemma-4-26B-A4B-it-qat-4bit")

prompt = "What's the current time?"
messages = [{"role": "user", "content": prompt}]

# ask current time and get first response
prompt = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tools=[get_json_schema(x) for x in list(TOOLS.values())],
)
text = generate(model, tokenizer, max_tokens=2560, prompt=prompt)
messages.append({"role": "model", "content": text})

# parse the tool calls and make the took call and append output
tool_calls = gemma4.parse_tool_call(text)
tool_calls = [tool_calls] if isinstance(tool_calls, dict) else tool_calls
messages.append(
    {
        "role": "model",
        "tool_responses": [
            {"name": tool["name"], "response": TOOLS[tool["name"]](**tool["arguments"])}
            for tool in tool_calls
        ],
    }
)

# give it to the agent in new prompt and generate the new output
prompt = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tools=[get_json_schema(x) for x in list(TOOLS.values())],
)
text = generate(model, tokenizer, max_tokens=2560, prompt=prompt)
messages.append({"role": "model", "content": text})

print(messages)
```

## The Output

This is how the final rendered template of messages look like :

```
<bos><|turn>system
<|think|>
<|tool>declaration:cur_time{description:<|"|>Get current date and time<|"|>,parameters:{type:<|"|>OBJECT<|"|>}}<tool|><turn|>
<|turn>user
What's the current time?<turn|>
<|turn>model
<|tool_call>call:cur_time{}<tool_call|><turn|>
<|turn>model
<|tool_response>response:cur_time{value:<|"|>2026-10-12 14:09:13.919064<|"|>}<tool_response|><|turn>model
The current time is 2:09 PM on Monday, October 12, 2026.<turn|>
<|turn>model
```

and this is the generated chat context :

```json
[
  {
    'role': 'user',
    'content': "What's the current time?"
  },
  {
    'role': 'model',
    'content': '<|channel>thought\nThe user is asking for the current time.
                I should use the `cur_time` tool to get this information.<channel|>
                <|tool_call>call:cur_time{}<tool_call|>'
  },
  {
    'role': 'model',
    'tool_responses': [{'name': 'cur_time', 'response': '2026-10-12 14:09:13.919064'}]
  },
  {
    'role': 'model',
    'content': '<|channel>thought\nThe user is asking for the current time.
                I have already called the `cur_time` tool and received the
                response `2026-10-12 14:09:13.919064`. I should now present
                this information to the user in a clear and natural way.<channel|>
                The current time is 2:09 PM on Monday, October 12, 2026.'
  }
]
```

This is the first time we actually see an LLM work agentically given enough turns to work through and tools.

# Measuring Harness Effectiveness

While I was working on my very first harness, I though giving agents many tools means more better work.
I also didn't have a good heuristic to measure how well the harness is doing it's job. Now I do have it!

> My current heuristic to measure effectiveness of a harness is
  $$E(H, M, G) = \lim_{n \to \infty} \sum_{t = 1}^{n} \frac{1}{n} \cdot \frac{\operatorname{int}(goal\\_achieved_t(H, M, G))}{turns\\_taken_t(H, M, G) - 1}$$
  where $goal\\_achieved_t$ is either $\texttt{true}$ or $\texttt{false}$ for the trial $t$. Operator $\operatorname{int}$ maps that to $0$ or $1$.
  $turns\\_taken_t$ is total number of turns taken to achieve the goal. $H$ is the harness we just wrote, $M$ is the model and $G$ is the goal.
  This heuristic assumes that the prompt clearly states what the goal is.

Not the best heuristic out there but it works for giving me an estimate. When this value goes down
I know that whatever changed caused the harness to perform worse. We will see how to use this heuristic
to make sure the harness quality stays always up. 

For now we can say that the effectiveness of current harness is $1$ with respect to the goal of _finding current time_.
Our harness took two turns and did achieve the goal to get me the current time. Note that we're not really measuring
this over infinite number of trials right now and we won't ever be. These models are pretty deterministic when you run
with `temp = 1.0`. You can still experiment to see the values change.

{{< notice type="note" >}}
The heuristic value alone does not tell you anything! A value of $0.1$ or $0.0000001$ for a goal is not good or bad alone.
The heuristic is there to tell you whether the effectiveness drops or improves when you change your harness
in a certain way. That's all. If for the same goal the value drops, then you've changed something that's bugging the agent.
If for the same goal the value increases, you've improved something.
{{< /notice >}}

> Defining $$ \Delta E(H, M, G) = E(H_{after}, M, G) - E(H_{before}, M, G)$$
> $H_{after}$ and $H_{before}$ being the harnesses before and after a change, and $E(H, M, G)$ defined as before
>  - if $\Delta E > 0$ then your harness improved to work with given model on the fixed goal
>  - if $\Delta E < 0$ then your harness is now worse than previous version to work with given model on the fixed goal
>  - if $\Delta E \sim 0$ then nothing changed noticeably

# Possibility of Ambiguity

Not a really good example at this point but to show the heuristic in real time, I will now add a few more
tools that do the same job, but their names and descriptions will be different.

I added one more tool to show the date only and edited the last tool to show time only.

```py
def get_current_date():
    """
    Get current date
    """
    return str(datetime.now().date())


def cur_time():
    """
    Get current time
    """
    return str(datetime.now().time())


TOOLS = {"cur_time": cur_time, "get_current_date": get_current_date}

prompt = "What's the current date and time?"
```

I got this transcript

```json
[
  {
    "role": "user",
    "content": "What's the current date and time?"
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I should use the `get_current_date` and `cur_time` tools to provide an accurate answer.<channel|>
                <|tool_call>call:get_current_date{}<tool_call|>
                <|tool_call>call:cur_time{}<tool_call|>"
  },
  {
    "role": "model",
    "tool_responses": [
      {
        "name": "get_current_date",
        "response": "2026-10-12"
      },
      {
        "name": "cur_time",
        "response": "15:07:12.984118"
      }
    ]
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I have already called `get_current_date` and `cur_time` and received
                the values: date is `2026-10-12` and time is `15:07:12.984118`.
                I should present this information clearly to the user.<channel|>
                The current date is October 12, 2026, and the time is 3:07 PM."
  }
]
```

We consider this harness $H_1$ and goal $G$. The heuristic is 1.0. Now, I will change my harness
and we'll now call it $H_2$, keeping the model same and goal same. I will change a tool name and
description.

```py
def my_date():
    """
    TODO
    """
    return str(datetime.now().date())


def cur_time():
    """
    Get current time
    """
    return str(datetime.now().time())


TOOLS = {"cur_time": cur_time, "my_date": my_date}

```

(as a said, not a perfect example, but it serves the purpose) Say, in a hurry of implementing lots
of features I forgot to write a description of the my_date tool, and just added TODO, expecting the
agent to _infer_ that `my_date` will return _a date_ (if not current date).

This is what the transcript looks like for $H_2$

```json
[
  {
    "role": "user",
    "content": "What's the current date and time?"
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I should use the `cur_time` tool to get this information.<channel|>
                <|tool_call>call:cur_time{}<tool_call|>"
  },
  {
    "role": "model",
    "tool_responses": [
      {
        "name": "cur_time",
        "response": "15:11:15.578351"
      }
    ]
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I have already called `cur_time()` and received the time \"15:11:15.578351\".
                However, the `cur_time` tool only provides the time, not the date.
                I should check if there's a tool for the date. Looking at the available tools,
                `my_date` seems relevant, although its description is \"TODO\".
                I'll try calling `my_date` to get the date.<channel|>
                <|tool_call>call:my_date{}<tool_call|>"
  }
]
```

The agent does end up calling `my_date`, but it didn't achieve this in two turns, so clearly
the heuristic for the triplet $(H_2, G, M)$ goes down, making $H_2$ measurably worse than $H_1$.

If I just change the name from `my_date` to `cur_date` ($H_3$), or, if I just change the description
from _TODO_ to _Get current date_ ($H_4$), the model again is able to find the answer in mere two turns,
bringing back the heuristics back at $1.0$ for both $H_3$ and $H_4$.

Here are the transcripts for $H_3$

```json
[
  {
    "role": "user",
    "content": "What's the current date and time?"
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I should use the `cur_time` and `cur_date` tools to get this information.<channel|>
                <|tool_call>call:cur_time{}<tool_call|>
                <|tool_call>call:cur_date{}<tool_call|>"
  },
  {
    "role": "model",
    "tool_responses": [
      {
        "name": "cur_time",
        "response": "15:21:11.957961"
      },
      {
        "name": "cur_date",
        "response": "2026-10-12"
      }
    ]
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.\n
                I have already called `cur_time` and `cur_date` and received the values:\n
                - Time: 15:21:11.957961\n- Date: 2026-10-12\n\nI should present this information
                clearly to the user.<channel|>
                The current date is October 12, 2026, and the time is 15:21:11."
  }
]
```

and for $H_4$

```json
[
  {
    "role": "user",
    "content": "What's the current date and time?"
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I should use the `cur_time` and `my_date` tools to get this information.<channel|>
                <|tool_call>call:cur_time{}<tool_call|>
                <|tool_call>call:my_date{}<tool_call|>"
  },
  {
    "role": "model",
    "tool_responses": [
      {
        "name": "cur_time",
        "response": "15:22:16.433367"
      },
      {
        "name": "my_date",
        "response": "2026-10-12"
      }
    ]
  },
  {
    "role": "model",
    "content": "<|channel>thought\nThe user is asking for the current date and time.
                I have already called `cur_time` and `my_date` and received the values:
                \n- Time: 15:22:16.433367\n- Date: 2026-10-12\n\nI should present this
                information clearly to the user.<channel|>
                The current date is October 12, 2026, and the time is 3:22 PM."
  }
]
```

In the end, if you think about it, it all boils down to what the agent is reading. It reads `my_date` and `TODO`, it does not really know what that tool
does. I think because these LLMs are trained on reward based system, it's possible that the agent didn't try calling `my_date` in first attempt because
it does not want to be wrong, and hence lower their reward. However, this just may be me overthinking on this.

## Arcane Knowledge

I wanted to show this behavior here because I've faced a slightly changed version of this issue in a very later stage of my harness.

- I provided agent with more than 30 tools
- A set of tools for getting taint analysis, forward slice, backward slice, etc...
- A set of tools for getting call graph, caller, callees, etc...
- A set of tools for debugging
- A set of tools for writing code, editing code, viewing code
- A set of tools to search code

At that point, my intuition was that doing so will give agent more flexibility in getting the task accomplished.
Rather this confused the agent a lot, and agent will spend a lot of tool calls to get the same answer it could've
achieved through only a few. Sometimes even single tool call.

After reading some transcripts, I realized that some of these tools were giving overlapping answers, and some of these
tools were not really required to get answers. I realized a few things

1. More tools is not more efficiency, more tools means more things seen by agent and hence can trigger more exploration, causing heuristic to drop
2. Overlapping tools means agent would want to confirm the output using different tools, rather just give it one source of truth, no scope of confusion
3. If two tools overlap, it means either they need to be merged, or re-designed to create a non-overlapping split. Overlapping leads to point 2
4. Wrong tool results could also mean bad exploration. This is a hidden thing that used to pop up very very late in a session. All the tools
   were vibe-coded and there were lots of hidden failures. I don't really want to rant about that in this post, but vibe-coding does not always work!

In the end, I started studying the transcripts manually and started dropping the tools if

- The agent didn't use a tool even once in very long sessions. This resulted in a lot of static analysis tools getting dropped.
  After dropping the tools, and running the sessions agan and again for long hours, more and more tools kept getting droppeed, and agent
  kept achieving same goal in lower number of turns.
- The agent got confused by one tool and started using other to verify claims. Verification shouldn't be for the agent to do!
  Rather make the harness give correct and precise (only what's requried) answer every single time!
  I had a tracer tool for the agent to avoid using GDB, and I also provided GDB and ability to set breakpoints. Agent sometimes
  spent lots of turns verifying the output of trace using gdb. 
- Make the tool outputs more linguistic rather than formal. For example, GDB output getting parsed and printed more like a language
  than a formal output that it currenly gives. I removed trace and converted it to a tool that generates linguistic
  output, and that alone made made the verification behavior go away!
- If the agent used two tools in succession most of the time, then it's a strong signal to merge the tools. Optimize a turn for the agent,
  because each turn takes some time! Rather save it my giving a single tool two purposes than having two tools with different purposes.
  The trace tool that got converted to a linguistic explainer kind-of replaced debugging almost completely. The agent almost stopped
  using GDB completely.

I renamed the tools that were very long to have shorter names and tools that had large matching prefixes to have shorter but least maatching
prefixes. Given the standard of tool description, and names, and the tool output stays up, the agent can recover from bad results a good number
of times. This is one of the properties of Gemma4 that came up a lot when I was experimenting with it, and this made me like the model a lot!

I also tried hiding some tools by default, and opening them up only later after a certain set of preceding tools are used first, in an attempt
to, first, keep the context size small, and second, reduce confusion on what to use first. In my case I hid debugging tools before any code was
written. Once the agent writes code, only then dynamic tools are made available for in chat context.

# Assignments

- Write a custom parser for tool outputs rather than using the provided parser by mlx-lm
  for whatever model you're using. It should be as simple as possible.
- In the part where we attach tool responses to the `messages` array (chat context), we skipped
  over the `elif` case of tool response rendering, where jinja template expects a different JSON
  schema for rendering tool response. Can you change the JSON generated for tool repsonses to
  work for that `elif` case? The new JSON schema must go with `role: tool` rather than `role: model`
  like we currently do at the moment.
- You already know how to write agentic loops, can you mix the concept of tool calling and
  generation inside a loop to make compute the true heuristic for $H_2$? I only said it's less than 1,
  but never gave you the actual value. Find it.
- Add a few more tools. Try the overlapping idea by tools that give both date and time.
- Try the verification idea by giving making the `cur_time` tool print a different date than `cur_date` tool.

# Resources

- [Expanding Chat Templates with Tools and Documents](https://huggingface.co/docs/transformers/main/en/chat_template_tools_and_documents)
- [Towards Long-Horizon Agents: A Survey](https://long-horizon-agents.github.io/)
- [Tool Calling Tests](https://github.com/ml-explore/mlx-lm/blob/ba8a08fd2ed72bbc53de84f89933f91fe4743e4a/tests/test_tool_parsing.py#L343)
- [Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Writing a Chat Template — Hugging Face](https://huggingface.co/docs/transformers/chat_templating_writing)
- [Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency)
- [Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use)

See you in next post! If you wanna talk about this, or say hi, reach me at hi@brightprogrammer.in, I'll try my best to reach back.
