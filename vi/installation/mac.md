---
lang: vi
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /vi/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installing on Mac <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

To install Node.js and Ghost on your mac you'll need an open terminal window. You can get one by opening spotlight and typing "Terminal".

### Install Node

*   On [http://nodejs.org](http://nodejs.org) press install, a '.pkg' file will be downloaded
*   Click on the download to open the installer, this is going to install both node and npm.
*   Click through the installer, finally entering your password and clicking 'install software'.
*   Once the installer is complete, go into your open Terminal window and type `echo $PATH` to check that '/usr/local/bin/' is in your path.

<p class="note"><strong>Note:</strong> If '/usr/local/bin' does not appear in your $PATH, see the <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">troubleshooting tips</a> to find out how to add it</p>

If you get stuck you can watch the whole [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Install and Run Ghost

*   Log in to [http://ghost.org](http://ghost.org), and then click the blue 'Download Ghost Source Code' button.
*   On the downloads page, press the button to download the latest zip file.
*   Click on the arrow next to the newly downloaded file, and choose 'show in finder'.
*   In finder, double-click on the downloaded zip file to extract it.
*   Next, grab the newly extracted 'ghost-#.#.#' folder and drag it onto the tab bar of your open terminal window, this will make a new terminal tab which is open at the correct location.
*   In the new terminal tab type `npm install --production` <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   In a browser, navigate to <code class="path">127.0.0.1:2368</code> to see your newly setup Ghost blog
*   Change the url to <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin.
*   See the [usage docs](/usage) for instructions on the next steps

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

