# Curriculum Vitae

## Experience

### RevEng.AI, Binary AI LTD

Software Consultancy Contractor (2024.06 - present)

- Fully develop and maintain software plugins for Rizin, Cutter, Radare2 & Iaito reverse engineering tools
- Keep up with fast ongoing chances in RevEng.AI’s API and features
- Weekly meetings to sync ideas between different plugin maintainers and RevEng.AI team

### RizinOrg

Open Source Google Summer of Code'23 Contributor

- Uplifted MIPS and NanoMIPS architecture instructions to RzIL intermediate language.
- Augmented BAP's Qemu to support trace testing of MIPS
- Trace-tested ulifted instructions to test the correctness of RzIL code execution.

## Open Source

### [reai-rz](https://github.com/RevEngAI/reai-rz)

Rizin & Cutter reverse engineering tool plugins using RevEngAI's API to provide AI features and aid in reverse
engineering and binary analysis. This is a part of my contract work.

### [reai-r2](https://github.com/RevEngAI/reai-r2)

Radare2 plugin to use RevEngAI's API to provide AI features in radare2 command line tool.
This is a part of my contract work.

### [creait](https://github.com/RevEngAI/creait)

A C library to help C programs interact with RevEng.AI's REST API. This is a part of my contract work.
The tool uses `libCURL` to perform REST API requests to RevEng.AI's
API endpoints and then uses `cJSON` library to parse the received `JSON` responses and provide then
to user in a structured manner inside C.

### [Rizin](https://github.com/rizinorg/rizin/pulls?q=is%3Apr+brightprogrammer+)

Multiple contributions to RizinOrg's rizin reverse engineering command line tool. Some of the PRs are merged
and some of the PRs I'm working on. I still make occasional contributions to the project whenever required.
Sometimes just to help the maintainers, and sometimes contributions are related to my contract works.

I'm currently working on rewriting demanglers for [rz-libdemangle](https://github.com/rizinorg/rz-libdemangle) in
[RizinOrg](https://github.com/rizinorg). I'm rewriting C++ demanglers for GNU v2 and GNU v3 ABI. The PR is a W.I.P
and can be found [here](https://github.com/rizinorg/rz-libdemangle/pull/69)

## Projects

## [Grammar Based Fuzz Input Generator](https://www.youtube.com/live/PTeJXdOCESE?si=h0YbrThhT7WtvVt6&t=166)

Wrote a grammar based unsupervised fuzz case generator for fuzzing programs that take text input.
This was a personal research project. No academics involved, completely separated from anyone's intrusion,
for my own learning. I explored ideas and wrote a test case generator that would take arbitrary context-free-grammar
in EBNF (Extended-Backus-Naur-Form) and generate random strings for that language.  

Source code is not available, but a working proof is available on [My YouTube channel](https://youtube.com/@brightprogrammer), where I live streamed
the development sessions. The live stream can be found [here](https://www.youtube.com/live/PTeJXdOCESE?si=h0YbrThhT7WtvVt6&t=166)

The tool worked by taking any grammar file, parsing it and generating an internal representation of grammar, and then
tranversing a graph, taking each route randomly. Everytime a terminal is expanded, the length of generated string is assumed
to be increased by one, which allowed me to put soft length stops on the generated string. This feature is especially useful
you only want to fuzz your program with small input sizes. With each increasing count, the probability of taking a non-terminal
decreased, which in turn slowly brought the state machine to select only from terminals, and hence to a stop after some more
iterations.

### [MisraOS](https://github.com/brightprogrammer/MisraOS)

A hobbyist Operating System I developed in first semester of college just to learn how operating systems are
written out of curiosity. At this point, I had already used a wide range of operating systems, but now there
was an internal craving to write one of my own.

### [XWars](https://github.com/X3eRo0/xwars)

A native GUI implemented for an r2wars like game for a custom virtual machine `xvm` written my some random
guy (whom now I know very well) on discord. Had lots of fun while writing, because my college entrance exams
just ended then and was exploring really interesting tops and the idea of writing VMs and desktop applications
was very new to me.

### [pwned](https://github.com/brightprogrammer/pwned)

Some very basic exploit scripts I wrote while learning binary exploitation. Mostly filled with exploits for
`printf` and `stack-buffer-overflow` vulns.

## Education

### Department of Mathematics, Birla Institute of Technology

Bachelors (Hons.) in Mathematics & Computing (2021 - 2024)

- GPA: 8.59/10.0
- Dissertation : Comprehensive Performance Analysis of 5G Network Stations using MOORA Method

## Relevant Coursework

- Formal Languages & Automata Theory
- Operating Systems
- Database & Management Systems
- Object Oriented Programming (JAVA)
- Probability & Statistics

Recently while self-hosting some services for myself, I learned a lot about system administration.
I already did know the "what", but this time I had to do the "how" of it. I now self host the following
services :

- [My own GIT service](https://git.brightprogrammer.in) - For hosting my own GIT repos, near and dear to my heart.
- [Knowledge Base / Wiki](https://kb.brightprogrammer.in) - For taking notes, journaling, documentation, thoughts, research, etc...

There were many other hosted before, like Uptime Kuma, Grist, etc..., but I realized
that I don't really need those. To do all this, I learned docker, docker-compose, systemd services,
nginx reverse proxy, postgresql, DDNS, user management, permission management, git bare repos and how to
host my own git service. I use CGIT for web frontend, and a bare git repo for hosting repos.
