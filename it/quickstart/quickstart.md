---
lang: it
layout: quickstart
meta_title: Primi passi con Ghost
heading: Primi passi con Ghost
subheading: Diventa operativo con Ghost.
chapter: quickstart
section: quickstart
---

# Panoramica <a id="overview"></a>

La Guida ai Primi passi con Ghost è indicata a coloro che hanno già familiarità con [Node](http://nodejs.org), o tecnologie simili come ruby on rails. Se sei nuovo da queste parti, è consigliabile cominciare dalla [Guida all'installazione](/installation.html).

## Get Ghost running locally <a id="ghost-local"></a>

Ghost requires node `0.10.*` (the latest stable version).

If you haven't already got it, head over to <http://nodejs.org> and download the latest version of Node.js. The installer will set up both Node and Node's excellent package manager, npm.

For users on Linux, rather than installing from the .tar.gz archive, you may want to [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

Download the latest version of Ghost from [Ghost.org/download/](https://ghost.org/download/). Unpack the archive to a folder where you'd like to run Ghost - anywhere will do!

Fire up your terminal (mac/linux) or command prompt (windows) and navigate to the root directory of your unpacked Ghost archive (where package.json lives).

To install Ghost, run `npm install --production`

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->