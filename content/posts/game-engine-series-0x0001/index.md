---
title: Game Engine Series [0x0001] - Project Setup
description: Project Setup
date: 2021-09-10T13:10:16.921Z
draft: false
tags:
  - GameEngine
  - ComputerGraphics
  - ProjectSetup
  - Infinity
categories:
  - GameEngine
  - ComputerGraphics
  - Infinity
projects: []
---
{{< img src="infinity-1400x1050.png" caption="Infinity Engine" title="Infinity Engine" >}}

In this post we will setup our project directory for development. There is no *hard and fast rule* to setup project directory structure and this one will be based on my past experiences. We will be using the following things (for now) : 

* [Vulkan Graphics API](https://www.vulkan.org/)
* [SDL (Simple DirectMedia Layer)](https://www.libsdl.org)
* C++ Compiler (Clang or GCC)
* [CMake Build System](https://cmake.org/)
* A Good Text Editor (I'll be using [VSCode](https://code.visualstudio.com/download))

The list may grow in future for things like allocators, logging systems, image loader, 3D model loader etc...

I plan to go in full depth of almost all topics that I think will be difficult to understand for new readers. At the time of writing this I am a beginner in Vulkan too and there are some concepts that I lack. In the pursuit of making this blog better and better (as this represents me) I will learn a lot of things and write about what I learned. This will be helpful to readers in a way that they will be learning this in the easiest language possible.

I planned various projects and they never got *that far* because of lack of motivation, but this time I'm motivated to make this series long enough for me to take the engine to a mature state and for you to learn Vulkan and see it's power.

Let's begin by creating the project folder. I will name my engine **Infinity**. The project directory structure will look something like this : 

* infinity

  * include
  * source

    * include
    * source
    * CMakeLists.txt
  * build
  * trash
  * lib
  * share
  * bin
  * dependencies
  * deps.sh
  * CMakeLists.txt

Below I will explain the meaning of each file and folder : 

* infinity (/) - project root directory
* /include - contains headers of dependencies
* /source - contains our actual project code
* /source/include - contains project header files (.hpp)
* /source/source - contains project source files (.cpp)
* /source/CMakeLists.txt - defines our libraries and declares that source is a subdirectory of main project
* /build - contains our build files
* /trash - contains useless code (but some of the code snippets might be useful)
* /lib - contains built library files of our dependencies
* /share - contains file corresponding to linux's share directory
* /bin - contains binaries of built dependencies
* /dependencies - contains git submodules
* /deps.sh - script to build our dependencies and place the build files in their corresponding location
* /CMakeLists.txt - the main CMake script for our project

Even if you don't create folders include, lib, share and bin, they will automatically be created by `deps.sh` script. Note that `deps.sh` will only work on Unix based OS. So, you will have to convert it to a windows script. 

Next, we will setup the `/CMakeLists.txt`  and try to compile a simple `main.cpp`. Below is what the `CMakeLists.txt` will look like.

```cmake
# cmake min version
cmake_minimum_required(VERSION 3.5)

# project settings
project(infinity VERSION 0 LANGUAGES CXX)
# set cmake standard to std++17
set(CMAKE_CXX_STANDARD 17)
# make this standard necessary for build
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# output created binaries in this directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${PROJECT_BINARY_DIR})

# take *.so files from this directory
link_directories("lib")

# subdirectories setup
add_subdirectory("source")
```

and the `/source/CMakeLists.txt` will contain : 

```cmake
# main executable
add_executable(${PROJECT_NAME} "source/main.cpp")
#more to comere here ...
```

After this create a `/source/source/main.cpp` file and enter the following contents into it :

```cpp
#include <iostream>

int main(){
    // print something
    puts("Infinity Engine [Version 0.0]");

    return 0;
}
```

If you are using VSCode like me then you can do `Ctrl`+`Shift`+`P` and search for `CMake: Configure` to generate build files or you can go to the `/build` and execute `cmake .. -G Ninja`. After this you can run `ninja` from build directory and then execute `./build/infinity`. 

```shellsession
➜  build ./infinity 
Infinity Engine [Version 0.0]
➜  build 
```

This works fine, this means that our build system is working as expected. 

Next we need to initialize git for our project so that we can easily add dependencies. For that go to project root and run `git init .` where "." means current directory. 

```shellsession
➜  infinity git init .
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint:   git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint:   git branch -m <name>
Initialized empty Git repository in /home/brightprogrammer/Projects/infinity/.git/
➜  infinity git:(master)
```

Next, let's add required dependencies in our project.

* [Vulkan Headers](https://github.com/KhronosGroup/Vulkan-Headers)
* [Vulkan Loader](https://github.com/KhronosGroup/Vulkan-Loader)
* [SDL](https://github.com/libsdl-org/SDL)

For that go to dependencies directory and runt he following commands :

```shellsession
➜  dependencies git:(master) ✗ git submodule add https://github.com/KhronosGroup/Vulkan-Headers
Cloning into '/home/brightprogrammer/Projects/infinity/dependencies/Vulkan-Headers'...
remote: Enumerating objects: 2151, done.
remote: Counting objects: 100% (297/297), done.
remote: Compressing objects: 100% (131/131), done.
remote: Total 2151 (delta 189), reused 238 (delta 159), pack-reused 1854
Receiving objects: 100% (2151/2151), 16.84 MiB | 3.54 MiB/s, done.
Resolving deltas: 100% (1274/1274), done.

➜  dependencies git:(master) ✗ git submodule add https://github.com/KhronosGroup/Vulkan-Loader 
Cloning into '/home/brightprogrammer/Projects/infinity/dependencies/Vulkan-Loader'...
remote: Enumerating objects: 70150, done.
remote: Counting objects: 100% (1176/1176), done.
remote: Compressing objects: 100% (486/486), done.
remote: Total 70150 (delta 810), reused 887 (delta 671), pack-reused 68974
Receiving objects: 100% (70150/70150), 48.47 MiB | 8.13 MiB/s, done.
Resolving deltas: 100% (52959/52959), done.

➜  dependencies git:(master) ✗ git submodule add https://github.com/libsdl-org/SDL
Cloning into '/home/brightprogrammer/Projects/infinity/dependencies/SDL'...
remote: Enumerating objects: 67197, done.
remote: Counting objects: 100% (1256/1256), done.
remote: Compressing objects: 100% (501/501), done.
remote: Total 67197 (delta 800), reused 1058 (delta 745), pack-reused 65941
Receiving objects: 100% (67197/67197), 81.81 MiB | 11.03 MiB/s, done.
Resolving deltas: 100% (51979/51979), done.
➜  dependencies git:(master) ✗ 
```

This will add the above repositories as `submodules` in our project. Next we need to setup `deps.sh` script to automate this task from next time.

```shell
#!/bin/zsh

# set project root directory
PROJECT_ROOT_DIRECTORY=$PWD
# project submodule directory
PROJECT_SUBMODULE_DIRECTORY=$PROJECT_ROOT_DIRECTORY/dependencies
# number of threads that make command will use
THREADS_PER_BUILD=4

# change to project submodule directory
cd $PROJECT_SUBMODULE_DIRECTORY
git submodule update --recursive

# function to build submodules
# first param : submodule name
# following params are cmake defines
BuildSubmodule(){
    # store submodule name
    SUBMODULE_NAME=$1
    shift; # shift to get cmake defines

    echo "Building Submodule $SUBMODULE_NAME"

    # change to submodule dir
    cd $PROJECT_SUBMODULE_DIRECTORY

    # change to submodule directory
    CURRENT_SUBMODULE_DIRECTORY=$PROJECT_SUBMODULE_DIRECTORY/$SUBMODULE_NAME
    cd $CURRENT_SUBMODULE_DIRECTORY

    # make build directory
    mkdir -pv build
    cd build
    rm -fv CMakeCache.txt

    # store cmake command in one var
    CMAKE_GENERATE_COMMAND="cmake .. "
    
    # append defines 
    for CMAKE_DEFINE in "$*"
    do
        CMAKE_GENERATE_COMMAND="$CMAKE_GENERATE_COMMAND $CMAKE_DEFINE"
    done

    # execute cmake command
    echo "Generated CMake Comamnd : $CMAKE_GENERATE_COMMAND"
    eval $CMAKE_GENERATE_COMMAND

    # build 
    echo "Starting Submodule $SUBMODULE_NAME Build"
    make -j$THREADS_PER_BUILD
    echo "$SUBMODULE_NAME Built"

    # install
    echo "Installing Submodule $SUBMODULE_NAME"
    make install
    echo "Installing Submodule $SUBMODULE_NAME -- DONE"

    # go back to submodule dir
    cd $CURRENT_SUBMODULE_DIRECTORY

    # remove build dir
    rm -rv build

    # go back to root directory
    cd $PROJECT_ROOT_DIRECTORY

    echo "Building Submodule $SUBMODULE_NAME -- DONE"
}

# build Vulkan-Header
BuildSubmodule Vulkan-Headers -DCMAKE_INSTALL_PREFIX=$PROJECT_ROOT_DIRECTORY

# build Vulkan-Loader
BuildSubmodule Vulkan-Loader -DCMAKE_INSTALL_PREFIX=$PROJECT_ROOT_DIRECTORY -DVULKAN_HEADERS_INSTALL_DIR=$PROJECT_ROOT_DIRECTORY

# build sdl
BuildSubmodule SDL -DCMAKE_INSTALL_PREFIX=$PROJECT_ROOT_DIRECTORY
```

This will clone our submodules if not cloned yet, build them and then place the build files in their right directories. The profit of setting up your project this way is that you can clone this repo on any system and then build it there without worrying about setting up dependencies.

Make a file named `/.gitignore` and add the following lines into it

```
build/
bin/
include/
lib/
share/
.cache/
```

Note that the "**/**" means this is a directory! Next, create a new GitHub repository and then link this project with that : 

```
➜  infinity git:(master) ✗ git remote add origin https://github.com/brightprogrammer/Infinity-Engine
➜  infinity git:(master) ✗ git add .
➜  infinity git:(master) ✗ git commit -m "init" 
[master (root-commit) 0911734] init
 10 files changed, 40 insertions(+)
 create mode 100644 .cache/clangd/index/main.cpp.CDECBC563D0B18EA.idx
 create mode 100644 .gitignore
 create mode 100644 .gitmodules
 create mode 100644 CMakeLists.txt
 create mode 160000 dependencies/SDL
 create mode 160000 dependencies/Vulkan-Headers
 create mode 160000 dependencies/Vulkan-Loader
 create mode 100644 deps.sh
 create mode 100644 source/CMakeLists.txt
 create mode 100644 source/source/main.cpp
➜  infinity git:(master) git push origin master
Username for 'https://github.com': brightprogrammer
Password for 'https://brightprogrammer@github.com': 
Enumerating objects: 15, done.
Counting objects: 100% (15/15), done.
Delta compression using up to 4 threads
Compressing objects: 100% (10/10), done.
Writing objects: 100% (15/15), 1.69 KiB | 345.00 KiB/s, done.
```

This completes the project setup! Let's try and check whether this works or not : 

```shellsession
➜  infinity git:(master) ✗ chmod +x deps.sh
➜  infinity git:(master) ✗ ./deps.sh

# cmake build log
```

As you can see this builds our dependencies in one fell swoop. If you wan to check whether the build was successful or not, you can go to `/include`, `/bin`, `/share` and `/lib` and see whether these folders contain some files or not. One more advantage of building submodules this way is that you are always supposed to get the latest version every time you update the dependencies by doing `./deps.sh`, but this can also be a disadvantage sometimes when the submodule repo's build is failing. In that case you will have to wait until the bugs/problems are fixed or just comment it out in the `deps.sh` script.

Few points  of wisdom that I'd like to give : 

Making a Game Engine is hard and very hard not in the sense of programming because you can get help for that but in the sense of motivation and patience. You will lose your motivation and patience many times but you will have to keep going to see that smile on your face when you render your first triangle, make it change colors, give it 3D aspects, make it a cube, then load 3D models, then make a small game prototype and so on. You achivements will be your only reward. Sometimes you will feel like giving up, in that case take some time off and switch to some other side project (you must have at least one side project). Then when you feel like it, jump back to this project. Sometimes you will feel like giving up and continuing at the same time. In that case you must go outside, take a walk, talk to someone. 

Making a good Game Engine is not only programming but a lot of reading too. You'll have to look for better design principles, better algorithms, how other Game Engines' work. You'll have to study theory more than programming in the beginning.

Graphics programing is completely different from what you do normally. In normal programs it's quite easy to debug it (trust me). You can fire up Valgrind to look for memory leaks, you can read the assembly code to check ABI related problems, you can read the code! and check for problems! but in graphics programming you don't have much tools to debug. If your triangle doesn't show up or if your shaders aren't working as expected or if there is a problem in your pipeline, it'll be damn hard to find. You can only read code and hope that you find the problem. Luckily there is a tool for us called [RenderDoc](https://renderdoc.org/) to check problems in our program but the help it provides is also limited like any other tool (something is better than nothing). 

One more thing, it's okay to give up now and pick up the topic later because learning the Vulkan API itself is a big barrier. Once you understand the Vulkan API and some other small concepts, Game Engine dev will be similar to software development.

It will be hard but ***IT WILL BE AMAZING.*** Once you take your Game Engine to a decent mature level, you'll be different, different like the ninja standing on the top of a tower in windy night with a big moon glowing behind him!, darkness covering this face, holding his Katana, ready to slay the enemies!

{{< img src="11854.jpg" >}}

Here are the few resources that I refer to when I get stuck : 

1. [How To Learn Vulkan](https://www.jeremyong.com/c++/vulkan/graphics/rendering/2018/03/26/how-to-learn-vulkan/) - ninepoints
2. [VkGuide](https://vkguide.dev/) - V. Blanco
3. [Vulkan Tutorial](https://vulkan-tutorial.com) - Alexander Overvoorde
4. [Vk Spec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html) (Very Important)
5. [Raw Vulkan](https://alain.xyz/blog/raw-vulkan) - Alain Galavan
6. [A Trip Through The Graphics Pipeline](https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/) - F. Giesen
7. [Vulkan Examples](https://github.com/SaschaWillems/Vulkan) - Sascha Willems
8. [Vulkan Samples](https://github.com/KhronosGroup/Vulkan-Samples) - Khronos Group
9. [Shaders](https://learnopengl.com/Getting-started/Shaders) - Learn OpenGL

I will keep increasing the resource list.

See  you in next post 😃