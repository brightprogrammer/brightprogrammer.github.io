---
author: "Siddharth Mishra"
title: "Use RSS Feeds"
date: "2026-05-01"
description: "Curating Your Own Feed"
tags:
  [
  "reading",
  "news",
  "content",
  "consumption",
  ]
---

# links@random

Few months back I noticed that some of my peers randomly post a link to an amazing writeup or an interesting news, and my question after reading that
content would be "How did they even come across this?". This is not only just now, back in college as well, a friend would often send me links to amazing
writeups by amazing people.

Now, this can be link to something cool a company did recently, or a new major event that happened in cybersecurity landscape. Whatever it may be, I just
wanted to have a constant stream of such content in my feed as well. No matter which field you're working in, it never hurts to keep yourself up-to-date
with the latest news going on. There are scientific journals, newsletters, blogs, streaming/content-creation services, etc... The list goes on.

One possible explanation is that people just remember to check out certain blogs frequently, maybe out of a slowly built habit. I'm not like that (at least for now).
Another explanation would be that they just have keen interest, and they regularly go online and search these things out, or maybe they were handed over
amazing writeups like that by someone else, and they just relayed the link to me.

# Feeds

One thing that I've tried many times in the past is saving links to amazing posts in a text file, or just bookmark it, but I rarely ever visited these
stored links back. Maybe because in today's day and age I'm driven by push notification attention. For this reason I've even quit a lot of social media,
and even turned off notification from useless apps like YouTube, for food delivery apps.

Now, if I can somehow use the power of push notifications to grab my attention for things that I curate, that would be really awesome!, and turns out
that a solution for this actually does exist! They are called _Feed Readers_. Many are available on Google play store, maybe even on Apple's app store.
I'd recommend getting a free one from F-Droid. Do check the background of the app however! How many contributors are there, are the contributors even real
person, how frequently is the app updated, how many issues are there, how many closed PRs are there, how many of the PRs look real and so on.

# Curated Feeds : Feed Readers

Feed readers are amazing, I've been using one for past three months I think! One thing at almost every every site in todays world will have is an [RSS feed](https://en.wikipedia.org/wiki/RSS),
a.k.a RDF Site Summary or Really Simple Syndication. This basically is an XML file that every site (supporting it) serves, and it gets updated everytime a new content
pops up on the site.

Feed readers just need a link to that XML file and they can keep a background loop for checking any changes in these feeds. If there are, they show a notification
in your shade (or popup a notification on your desktop/laptop) and you now have something to read!

# Why

One thing I've noticed that when I feel like I need consume some content, going over my feed reader and finding interesting stuff to read is very easy, and free
at the same time. This content is curated and maintained by me, and not my a recommendation algorithm trying to gain my attention, or show me ads to siphon some
money out of my pocket!

There are many people who write write good stuff regularly and amazing stuffs sometimes, which is waaay better than consuming normie content on sloppy platforms,
where even the content creator you link is shaking hands with shady companies in the back, and introducing you their products as if it's the new big deal. This
can obviously happen in the blogs you follow as well, but I think when you're reading, you're consuming a bit slowly and your brain gets enough time to counter with
facts and even reject it! In fast moving content forms, your brain only gets chance to consume, not react/respond.

# Don't Pay!

I have my feed reader app installed and I have a way to sync it across devices, and I don't pay for it, so there is a way! If I was able to convince you to even try
a feed reader, go on and just install any free one out that (after checking the background of the app, developer, company, etc...) then just use it! Please dont go over
paying for any feed subscription!

In todays age, you can even vibe code an app just for you, or if you you're comfortable with programming on your own, just write a python
script that reads from a text file which contains all the links to RSS feeds, pull the feeds  locally and then check every half-an-hour or so for any file content changes.
This can be as easy as comparing the SHA256 or MD5 of the new feed vs the old local copy of feed you have. Rendering it is also easy, use something like flask
to parse the XML and present you entries as is, that's a really good starting point! You can keep building on top of it slowly adding features you like and done! You
have a personal curated, distraction free, feed! Your own feed!

See you next time ;-)
