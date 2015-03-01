---
lang: zh_TW
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: Using Ghost
subheading: Finding your way around, and getting set up the way you want
chapter: usage
section: configuration
permalink: /zh_TW/usage/configuration/
prev_section: usage
next_section: settings
---


## Configuring Ghost <a id="configuration"></a>

After you run Ghost for the first time, you'll find a file called `config.js` in the root directory of Ghost, along with the `index.js`. This file allows you to set environment level configuration for things like your URL, database, and mail settings.

If you haven't yet run Ghost for the first time, you won't have this file yet. You can create one by copying the `config.example.js` file - that's what Ghost does when it starts. 

To configure your Ghost URL, mail or database settings, open `config.js` in your favourite editor, and start changing the settings for your desired environment. If environments aren't something you've come across yet, read the documentation below.

## About Environments <a id="environments"></a>

Node.js, and therefore Ghost, has the concept of environments built in. Environments allow you to create different configurations for different modes in which you might want to run Ghost. By default Ghost has two built-in modes: **development** and **production**.

There are a few, very subtle differences between the two modes or environments. Essentially **development** is geared towards developing and particularly debugging Ghost. Meanwhile "production" is intended to be used when you're running Ghost publicly. The differences include things like what logging & error messaging is output, and also how much static assets are concatenated and minified. In **production**, you'll get just one JavaScript file containing all the code for the admin, in **development** you'll get several.

As Ghost progresses, these differences will grow and become more apparent, and therefore it will become more and more important that any public blog runs in the **production** environment. This perhaps begs the question, why **development** mode by default, if most people are going to want to run it in **production** mode? Ghost has **development** as the default because this is the environment that is best for debugging problems, which you're most likely to need when getting set up for the first time.

##  Using Environments <a id="using-env"></a>

In order to set Ghost to run under a different environment, you need to use an environment variable. For example if you normally start Ghost with `node index.js` you would use:

`NODE_ENV=production node index.js`

Or if you normally use forever:

`NODE_ENV=production forever start index.js`

Or if you're used to using `npm start` you could use the slightly easier to remember:

`npm start --production`

### Why use `npm install --production`?

We have been asked a few times why, if Ghost starts in development mode by default, does the installation documentation say to run `npm install --production`? This is a good question! If you don't include `--production` when installing Ghost, nothing bad will happen, but it will install a tonne of extra packages which are only useful for people who want to develop Ghost core itself. This also requires that you have one particular package, `grunt-cli` installed globally, which has to be done with `npm install -g grunt-cli`, it's an extra step and it's not needed if you just want to run Ghost as a blog.

