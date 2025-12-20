---
author: "Siddharth Mishra"
title: "How I Host My Own GIT Service"
date: "2025-01-27"
description: "Independent Git Service"
tags: ["self-hosting", "git"]
---

## Options

- GitLab : I've read reviews, and it's comparable to GitHub, while at the same time, really resource intensive.
- Gitea : I've used, has a nice looking GUI, and provides many features, that I as a solo developer mostly
won't use. It's less resource heavy than GitLab, but I still realized, it always stood on top of my htop.
- cgit : A very lightweight, simple looking Git frontend written in C. This won't provide many features like Gitea
or GitLab, and you'll have do do everything yourselves : creating git repos, changing descriptions, adding users, etc...
but it's all simple.

I used Gitea, and then switched to cgit soon after that. My main reason was I wanted something that looks as simple
as what the linux kernel developers use out there : git.kernel.org. So this guide is for those who want to
use `cgit` to host their git repo.

## Installation

### Do You Even Wan't A Frontend?

If you want to show your projects to outside world, then you need one of those options above. If you work
yourself, and just need a way to do version control for your projects, so you can revert back changes, work
on features without breaking original code, then you don't need one. One thing that fronted will help you
is to view your repos from any device that supports web browsing or show it it anyone, meaning they
can clone your repo using the `http[s]` url and give it a try. 

Note : I'm taking about need. You know what you want.

So, for those who don't want a frontend, and those who want it, the first common thing is setting up git,
adding users, creating and managing repos, etc... I'll tell you my usual workflow, rest you'll probably
figure out while working yourself.

### Backend

You first need a server where you'll host your git server, and at least one of the following things :

- A static IP
- A local IP
- A domain name

If you have a single computer, you can still host your git server at `localhost`.

Next we need you need to install `git` and `ssh` on the server. We'll use `ssh` to communite with our `git`
server. `ssh` comes installed with most server OS. I have Ubuntu server installed on my old laptop, where I
host all my services.

First create a directory where your git repos will be hosted. I'll call this `/home/git`.
All your git settings will be stored here. This will include things like allowed `ssh` keys,
public private repos, login shell messages, etc... Now, create a `git` user :

```sh
sudo useradd git -d /home/git -s $(which git-shell)
```

Using `git-shell` as git's login shell, will disable interactive login. To show a custom message when someone
tries to login to ssh interactive shell, do

```sh
mkdir -pv /home/git/git-shell-commands
cat >$HOME/git-shell-commands/no-interactive-login <<\EOF
#!/bin/sh
printf '%s\n' "Hi $USER! You've successfully authenticated, but I do not"
printf '%s\n' "provide interactive shell access."
exit 128
EOF
chmod +x $HOME/git-shell-commands/no-interactive-login
```

#### Creating Git Repos

Creating git repos as as easy as doing 

```sh
cd /home/git
git init --bare NewRepoName.git
```

You should also edit git repo description in `/home/git/NewRepoName.git/description`. This will be displayed
if you use a frontend like cgit.

#### User Management

This guide will show you how to setup this server only for you. I don't have requirements for multiple users
yet so I haven't explored yet. I can still allow trusted individuals to access my git repos, do push/pull/clone etc...
over ssh by adding their ssh key, but that's a matter of trust, which in the world of cyber-security shouldn't be there.
You can trust the people, but not their devices.

To add a new user (or give your machine access to your git repos over ssh), you get the public ssh key,
and then add it into `/home/git/.ssh/authorized_keys`.

If you do need to create and manage users and their read/write permissions, then there are ways to do it. Don't panic.
There are simple ways, like using GitLab, or Gitea from start, or use Gitola for user management and repo management.
It's also possible by writing a bash script that is executed for each git command, that redirects users based on their
ssh key. More documentation can be found in git-scm docs website.

### Frontend

```sh
sudo apt install -y git nginx fcgiwrap cgit
```

`cgit` installed is a CGI, and to serve that we'll use `fcgiwrap` to serve this, and `nginx` as reverse proxy
to serve this for a subdomain or a sub-path to our domain name. `nginx` will take requests and forward it to
the `cgit` binary. First, create a new file for your site config in `/etc/nginx/sites-available` and add
following to it :

```nginx
################################################
#                CGIT SETUP                    #
################################################
server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name git.brightprogrammer.in;

  ssl_certificate /path/to/ssl/brightprogrammer.in.crt;
  ssl_certificate_key /path/to/ssl/brightprogrammer.in.pem;

  # Path to static web resources for cgit
  root /home/git/static;

  try_files $uri @cgit;

  location @cgit {
    include             fastcgi_params;

    # Path to the CGI script that comes with cgit
    fastcgi_param       SCRIPT_FILENAME /usr/lib/cgit/cgit.cgi;

    fastcgi_param       PATH_INFO       $uri;
    fastcgi_param       QUERY_STRING    $args;
    fastcgi_param       HTTP_HOST       $server_name;

    # Path to the socket file that is created/used by fcgiwrap
    fastcgi_pass        unix:/run/fcgiwrap.socket;
  }
}
```

Some of the settings is specific for my use case. For example, I host some static theme content
in `/home/git/static`. Now check your `nginx` config using `sudo nginx -t` and then if everything is ok,
restart it using `sudo systemctl restart nginx`, and you should see your git fronted hosted at the
path you specified in `server_name` field. In my case it's git.brightprogrammer.in.

## Ending Comments

This is it! I might miss out something, if this is the case, then please reach out to me, in the comments,
or through email. Enjoy ;-)
