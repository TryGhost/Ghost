---
lang: zh_TW
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: Using Ghost
subheading: Finding your way around, and getting set up the way you want
chapter: usage
next_section: configuration
---

## Overview <a id="overview"></a>

Hopefully at this point you've got Ghost installed and running, and you're ready to get blogging. The following sections are going to walk you through absolutely everything you need to know about Ghost, so that you are familiar with everything, and set up exactly how you want to be.

### First run

If you are running Ghost for the very first time, then you need to create your admin user account. Navigate to your new blog in your favourite browser, and then change the URL to <code class="path">&lt;your URL&gt;/ghost/signup/</code>. You should see a screen just like this one:

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/ghost-signup.png)

*   Fill in your **Full Name** as the name you want to appear as the author of blog posts.
*   Then enter your **Email Address** - make sure it's valid, and carefully enter a sensible **Password** (it needs to be at least 8 characters long).
*   Hit the big blue **Sign Up** button, and you will be logged in to your blog.

That's it! You can now start writing blog posts.

#### Messages

On your first run of Ghost you should see a blue info message at the top of the screen that looks a little like this:

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/first-run-info.png)

It let's you know some information about the way Ghost is configured, such as which environment you've started it in, and what you've got your URL set to. Jump to the [configuration](/usage/configuration/) section to find out more about environments, and how to configure Ghost. You won't be able to get rid of this message until you log in (this is a bug we're working on), but once you have, and you're familiar with the info, close it by pressing the x. It won't appear again.

You may also see an orange warning message with regard to email:

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/email-warning.png)

This isn't critical to setting up your blog so you can get started writing, but it is a good idea to mosey on over to the [email documentation](/mail) at some point, and learn about configuring Ghost to send email. This is currently only used to send you a reset email if you forget your password. Not important for blogging, but really useful if you ever need it!

