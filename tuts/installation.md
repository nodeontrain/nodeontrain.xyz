---
layout: tuts
title: Installation
prev_section: home
next_section: usage
permalink: /tuts/installation/
---

Getting Trainjs installed and ready-to-go should only take a few minutes. If it
ever becomes a pain in the ass, please [file an
issue](https://github.com/nodeontrain/trainjs/issues/new) (or submit a pull request)
describing the issue you encountered and how we might make the process easier.

### Requirements

Installing Trainjs is easy and straight-forward, but there are a few requirements
you’ll need to make sure your system has before you start.

- [Node.js 5.x](http://nodejs.org)
- Linux, Unix, Mac OS X, or Windows

<div class="note info">
  <h5>Running Trainjs on Linux</h5>
  <p>
	Trainjs can run on multiple platforms, but the official
	tutorial only support installation on Linux platforms.
  </p>
</div>

## Install Node.js

At the terminal prompt, simply run the following commands to install Node.js:

{% highlight bash %}
~ $ curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
~ $ sudo apt-get install -y nodejs
{% endhighlight %}

You can read [this guide](https://github.com/nodesource/distributions)
to install Node.js on other platforms.

## Install and Trainjs

You can do this more easily by using [npm](https://npmjs.org):

{% highlight bash %}
~ $ sudo npm install -g trainjs
{% endhighlight %}
