---
lang: example_translation
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /example_translation/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Installing on Windows <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Install Node

*   On [http://nodejs.org](http://nodejs.org) press install, an '.msi' file will be downloaded
*   Click on the download to open the installer, this is going to install both Node and npm.
*   Click through the installer, until you get to the screen telling you Node.js is installed.

If you get stuck you can watch the whole [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### Download & Extract Ghost

*   Log in to [http://ghost.org](http://ghost.org), and then click the blue 'Download Ghost Source Code' button.
*   On the downloads page, press the button to download the latest zip file.
*   Click on the arrow next to the newly downloaded file, and choose 'show in folder'.
*   When the folder opens, right click on the downloaded zip file and choose 'Extract all'.

If you get stuck you can watch the whole [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### Install and Run Ghost

*   In your start menu, find 'Node.js' and then choose 'Node.js Command Prompt'
*   In the Node command prompt, you need to change directory to where you extracted Ghost. Type: `cd Downloads/ghost-#.#.#` (replace hashes with the version of Ghost you downloaded).
*   Next, in the command prompt type `npm install --production` <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   In a browser, navigate to <code class="path">127.0.0.1:2368</code> to see your newly setup Ghost blog
*   Change the url to <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin.
*   See the [usage docs](/usage) for instructions on the next steps

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

