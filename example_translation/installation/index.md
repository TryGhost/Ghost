---
lang: example_translation
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## Overview <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

The Ghost documentation is very much a work in progress, it is updated and improved regularly. If you get stuck or have suggestions for improvements, let us know.

Ghost is built on [Node.js](http://nodejs.org), and requires version `0.10.*` (latest stable version).

Running Ghost locally on your computer is straight forward, but requires that you install Node.js first.

### What is Node.js?

[Node.js](http://nodejs.org) is a modern platform for building fast, scalable and efficient web applications.
    Over the past 20 years, the web has evolved from a collection of static pages into a platform capable of supporting complex web applications like Gmail and facebook.
    JavaScript is the programming language which has enabled this progress.

[Node.js](http://nodejs.org) provides us with the ability to write JavaScript on server. In the past JavaScript has only existed in the browser, and a second programming language, such as PHP, was required to do server side programming. Having a web application consist of a single programming language is a great benefit, and this also makes Node.js accessible to developers who might have traditionally stayed on the client side.

The way that [Node.js](http://nodejs.org) makes this possible, is by wrapping up the JavaScript engine from Google's Chrome browser and making it installable anywhere. This means that you can get Ghost installed on your computer to try it out very quickly and easily.
    The following sections detail how to install Ghost locally on [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) or [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) or alternatively will help you get Ghost deployed on a [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

### Getting started

If you don't fancy following instructions on installing Node.js and Ghost manually, the lovely people over at [BitNami](http://bitnami.com/) have created [Ghost installers](http://bitnami.com/stack/ghost) for all major platforms.

I want to install Ghost on:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

If you've already decided to deploy Ghost to your server or hosting account, that's great news! The following documentation will walk you through various options for deploying Ghost, from manual setups, to one-click installers.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Remember that Ghost is brand new, and the team are working hard to deliver features at a furious pace. If you need to upgrade Ghost to the latest version, follow our [upgrading documentation](/installation/upgrading/).
    If you get stuck, checkout the [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), or if that doesn't help, please get in touch via the [Ghost forum](http://ghost.org/forum) where the Ghost staff and community are on hand to help you with any problems.

