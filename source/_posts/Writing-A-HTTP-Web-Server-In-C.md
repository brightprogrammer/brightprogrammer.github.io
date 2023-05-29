---
title: Writing A HTTP Web Server In C
date: 2023-04-15T03:12:25+05:30
description: "Using Linux Socket API"
tags: [project-blue, server, network-programming, socket, linux, http, note]
categories: [network-programming, 'web-server']
---

This post will be about creating a simple HTTP web server using only C (and HTML ofcourse XD). We'll learn about the Linux sockets API and see how can we read an HTML file and serve it on localhost at a specific post.

<!-- more -->

## First Things First!   
For those who are here just for code and hack it to make it their own, please have it :  


```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>

#include <arpa/inet.h>

/**
 * Basic procedure to create server is.
 * setup hints in struct addrinfo
 * getaddrinfo()
 * use the information retrieved from getaddrinfo() to create a socket
 * call socket()
 * bind() socket to specific port
 * listen() to wait for incoming connection
 * accept() an incoming connection
 * send() your HTML file with an HTTP header.
 * */

/** typedef to represent a socket descriptor */
typedef int SOCKET_DESC;
typedef int STATUS;

#define ERROR_AND_EXIT(...) fprintf(stderr, "[!] ERROR : "); fprintf(stderr, __VA_ARGS__); exit(1)

#define SERVER_ADDR "localhost"
#define SERVER_PORT "1337"
#define SERVER_INCOMING_CONNECTION_QUEUE_SIZE 20

int main() {
    /* get address information */
    struct addrinfo hints, *res = NULL;

    // setup hints
    memset(&hints, 0, sizeof hints);
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = AI_PASSIVE; /* set my IP address for me */

    // get information
    // NULL and AI_PASSIVE will indicate to get addr info for local host
    STATUS status = getaddrinfo(NULL, SERVER_PORT, &hints, &res);
    if(status != 0) {
        ERROR_AND_EXIT("getaddrinfo failed : %s\n", gai_strerror(status));
    }


    // iterate over all entries in the linked list
    // and print information.
    char ipstr[INET6_ADDRSTRLEN] = {0};
    for(struct addrinfo *iter = res; iter != NULL; iter = iter->ai_next) {
        char *ipver = NULL;
        void *addr = NULL;

        if(iter->ai_family == AF_INET) {
            struct sockaddr_in *ipv4 = (struct sockaddr_in *)iter->ai_addr;
            ipver = "IPv4";
            addr = &(ipv4->sin_addr);
        } else {
            struct sockaddr_in *ipv6 = (struct sockaddr_in *)iter->ai_addr;
            ipver = "IPv6";
            addr = &(ipv6->sin_addr);
        }

        memset(ipstr, 0, sizeof ipstr);
        inet_ntop(iter->ai_family, addr, ipstr, sizeof ipstr);

        printf("%s : %s\n", ipver, ipstr);
    }

    // create a socket with returned information
    struct addrinfo *target = res;
    SOCKET_DESC sock_desc = socket(target->ai_family, target->ai_socktype, target->ai_protocol);
    if(!sock_desc) {
        ERROR_AND_EXIT("Failed to create socket");
    }

    // bind socket descriptor to a port
    status = bind(sock_desc, target->ai_addr, target->ai_addrlen);
    if(status != 0) {
        ERROR_AND_EXIT("bind : returned %d\n", status);
    }

    // listen/wait for connections
    listen(sock_desc, SERVER_INCOMING_CONNECTION_QUEUE_SIZE);

    // accept an incoming connection
    struct sockaddr_storage conn_addr;
    socklen_t addr_size = sizeof conn_addr;
    SOCKET_DESC new_conn = accept(sock_desc, (struct sockaddr *)&conn_addr, &addr_size);
    if(!new_conn) {
        ERROR_AND_EXIT("accept : failed to accept connection\n");
    }

    // send some data
    char http_header[8000] = "HTTP/1.1 404 OK\r\n\n"
        "<!doctype html>"
        "<html>"
        "<head><title>project blue</title></head>"
        "<body bgcolor=\"gray\"><h1> <font color=\"cyan\">Project Blue</font></h1><body>"
        "</html>";
    send(new_conn, http_header, sizeof http_header, 0);

    freeaddrinfo(res);
    target = NULL;
    res = NULL;
}
```

and here's the output :   
  <img src="/images/working-server.png" />
  Working image of server

## Background
I created this blog but it's static because it's being served on hugo. Now I have this urge to make this site dynamic for some reason and I wanna do it in C. I can use python easily since I already have experience with Django as I created a site using that last year. It was hosted on a free hosting service which got converted to paid later previous year. I can use Python or if I wanna look more cool (or fool to some people) I can use C++ but I just wanna create this whole backend in C and that too from scratch.  
That's enough background, let's move on with actual explanation of the above code. You can also see the coding session [here](https://youtu.be/P9muoNLgZio) on [My YouTube Channel](https://youtube.com/@brightprogrammer).  


## Explanation  
We start of with this guy here : 
```c
/**
 * Basic procedure to create server is.
 * setup hints in struct addrinfo
 * getaddrinfo()
 * use the information retrieved from getaddrinfo() to create a socket
 * call socket()
 * bind() socket to specific port
 * listen() to wait for incoming connection
 * accept() an incoming connection
 * send() your HTML file with an HTTP header.
 * */
```
Just follow everything in exact same manner and you'll have your basic web server running in no time.

First thing you need to understand is use of `struct addrinfo` and `getaddrinfo()`. I'll explain you this from two point of views : 
- Client
- Server

### When We Are Client

Clients like web browsers need to connect to any domain or IP address that you give to it. If a connection cannot be made or if you entered a wrong URL or IP address, they also need to inform you with relevant error messages. There are a few steps involved in making connection (already listed above), but the very first step is Domain Name Resolution.  

This step involves taking the domain name like `https://brightprogrammer.in` and getting all `IPv4` and/or `IPv6` addresses that are pointed by the given domain name. This is done by the help of DNS servers but let's not get into that much depth. Now in our case, this resolution is provided by the `struct addrinfo hints` and `getaddrinfo()`.  

We fill in the `hints` variable with relevant details like which IP versions we want to enumerate and what protocol are we using `TCP` -> `SOCK_STREAM` or `UDP` -> `SOCK_DGRAM`. Next, you need to pass in the domain name you are trying to get information about in the first parameter of `getaddrinfo` call.

```c
/* get address information */
struct addrinfo hints, *res = NULL;

// setup hints
memset(&hints, 0, sizeof hints);
hints.ai_family = AF_UNSPEC;
hints.ai_socktype = SOCK_STREAM;
hints.ai_flags = AI_PASSIVE; /* set my IP address for me */

// get information
// NULL and AI_PASSIVE will indicate to get addr info for local host
STATUS status = getaddrinfo(NULL, SERVER_PORT, &hints, &res);
if(status != 0) {
    ERROR_AND_EXIT("getaddrinfo failed : %s\n", gai_strerror(status));
}
```

If you already have exact data like IP version, IP address and port number then you don't need to perform this step. But in case of clients like web browsers, we need this step to get as much details about target as possible. The returned `res` struct is a linked list of returned details.  

### When We Are Server

Servers already know which port they'll listen to and which IP address they'll use so they can skip this step. I don't know exactly at this moment because by the time of writing this I'm a beginner in network programming so it's just my intuition. For servers we can hardcode all data to the `socket()` call!

### Example Run

For example :  
Running this program as it is will get us addr info of local host like this :  
```
IPv4 : 0.0.0.0
IPv6 : ::
```

and changing the first parameter in `getaddrinfo` returns :  
```
IPv4 : 185.199.108.153
IPv4 : 185.199.109.153
IPv4 : 185.199.110.153
IPv4 : 185.199.111.153
IPv6 : 0:0:2606:50c0:8000::
IPv6 : 0:0:2606:50c0:8001::
IPv6 : 0:0:2606:50c0:8003::
IPv6 : 0:0:2606:50c0:8002::
```

Which are IP addresses that GitHub asks you to set when attaching your github pages site with your domain name. Interesting isn't it?  

### Sockets Sockets Sockets!
The very next step is to create a socket that will connect to our retrieved IP addresses. Note that if we get IP addresses this way then we don't need to hardcode protocol and all since that'll all be provided by our helpful `struct addrinfo`.  

Here's how `addrinfo` struct looks like :  
```c
struct sockaddr {
   unsigned short   sa_family;   /* indicates IPv4 or IPv6 family */
   char             sa_data[14]; /* can contain IPv4 or IPv6 addresses*/
};

struct addrinfo {
    int     ai_flags;          /* (too complicated for me to understand atm) */
    int     ai_family;         /* AF_INET for IPv4 and AF_INET6 for IPv6 or AF_UNSPEC for both/any */
    int     ai_socktype;       /* SOCK_STREAM or SOCK_DGRAM */
    int     ai_protocol;       /* set it to 0 for default (TCP) protocol */
    size_t  ai_addrlen;        /* size of upcoming ai_addr struct */
    struct  sockaddr *ai_addr; /* retrieved ip address */
    char    *ai_canonname;     /* canonical name */
    struct  addrinfo *ai_next; /* this struct can form a linked list */
};
```

Now we have all the information we want about our target.
- IP Address
- Port (we already had this since we passed it to `getaddrinfo`)
- Protocol  

So, lets create a socket!  
```c
// create a socket with returned information
struct addrinfo *target = res;
SOCKET_DESC sock_desc = socket(target->ai_family, target->ai_socktype, target->ai_protocol);
if(!sock_desc) {
    ERROR_AND_EXIT("Failed to create socket");
}
```

Nice, so we now have a socket!

### When We Are Client
Client's don't need to bind to any port in order to make any connection. They can just create a socket and call `connect` in order to establish a connection with target server.  

(Not covering client case here because that's easy and out of scope of this article)

### When We Are Server
Servers need a fix port on which they will wait/listen for incoming connections. For this they do a `bind()` just after creating a socket. 

It might be possible that after restarting your server, you can't bind to the same port again, in that case you need to setup a mechanism to reuse the same port (out of scope of this article).

```c
// bind socket descriptor to a port
status = bind(sock_desc, target->ai_addr, target->ai_addrlen);
if(status != 0) {
    ERROR_AND_EXIT("bind : returned %d\n", status);
}

// listen/wait for connections
// this queue size is sometimes called backlog
listen(sock_desc, SERVER_INCOMING_CONNECTION_QUEUE_SIZE);
```

This way we are waiting for connections on a specific port. Note that if you are a client, you'll use the same port that the server bound to, to get information!

### Accepting Connections
After we get a connection, we'll call `accept` to accept the connection and read/write to/from the new socket descriptor. Yes! everytime you accept a new connection a new socket is created. The old one's still out there listening to new connections (if you wanna do that) but new ones are also created automatically on accepting new connections.  

```c
// accept an incoming connection
struct sockaddr_storage conn_addr;
socklen_t addr_size = sizeof conn_addr;
SOCKET_DESC new_conn = accept(sock_desc, (struct sockaddr *)&conn_addr, &addr_size);
if(!new_conn) {
    ERROR_AND_EXIT("accept : failed to accept connection\n");
}
```

Yay! we accepted connection, now if there's no error, we can just `send()`/`recv()` data to/from the socket descriptor. If this is a stream socket connection then this socket will act like a pipe where whatever you write on the server end will reach on the client end in same exact order.  

### Sending A Webpage To Client
Note that our client in this case is the web browser itself! So let's send a web page :  

```c
// send some data
char http_header[1024] = "HTTP/1.1 200 OK\r\n\n"
    "<!doctype html>"
    "<html>"
    "<head><title>project blue</title></head>"
    "<body bgcolor=\"#222222\"><h1> <font color=\"red\">Project Blue</font></h1><body>"
    "</html>";
send(new_conn, http_header, sizeof http_header, 0); /* when last argument is 0, this acts like a write(fd, data, size) call */
```


`send` returns the number of bytes sent. It might happen that only a part of data was sent but rest was left out. `send` API documentation states  that it's your responsibilty to reuse `send` and send the rest of data! This is easily doable since our data is sent like a stream and we know the offset in the buffer! This means you need to add a verification check to how much data you intended to send and how much was actually sent!

Well! This marks the ending of this post. Let's end this with a beautiful quote :  
> “The best way to predict the future is to invent it. Every technology really needs to be shipped with a special manual – not how to use it but why, when and for what.” - Alan Kay
