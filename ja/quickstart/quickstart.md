---
lang: ja
layout: quickstart
meta_title: Ghost Quickstart
heading: Ghost Quickstart
subheading: Get up and running with Ghost.
chapter: quickstart
section: quickstart
---

# Overview <a id="overview"></a>

The Quickstart Guide to getting Ghost up and running is aimed at those of you who are already familiar with [Node](http://nodejs.org), or something similar like ruby on rails. If you're new in town, we recommend taking a look at the more in depth [Installation Guide](/installation.html).

## Get Ghost running locally <a id="ghost-local"></a>

Ghost requires node `0.10.*` (the latest stable version).

If you haven't already got it, head over to <http://nodejs.org> and download the latest version of Node.js. The installer will set up both Node and Node's excellent package manager, npm.

For users on Linux, rather than installing from the .tar.gz archive, you may want to [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

Download the latest version of Ghost from [Ghost.org](http://ghost.org). Unpack the archive to a folder where you'd like to run Ghost - anywhere will do!

Fire up your terminal (mac/linux) or command prompt (windows) and navigate to the root directory of your unpacked Ghost archive (where package.json lives).

To install Ghost, run `npm install --production`

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->