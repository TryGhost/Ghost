---
lang: fr
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /fr/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
canonical: http://support.ghost.org/how-to-upgrade/
redirectToCanonical: true
---

# Upgrading Ghost <a id="upgrade"></a>

Upgrading Ghost is super straightforward.

There is a couple of different ways you might want to go about it. The following describes what needs to happen, and then covers the process step-by-step for both doing it [point-and-click style](#how-to) and via a [command line](#cli), so that you are free to choose the method you are most comfortable with.

<p class="note"><strong>Back-it-up!</strong> Always perform a backup before upgrading. Read the <a href="#backing-up">backup instructions</a> first!</p>

## Overview

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost, once installed, has a folder structure similar to that shown on the left. There are two main directories <code class="path">content</code> and <code class="path">core</code>, plus some files in the root.

Upgrading Ghost is matter of replacing the old files with the new files, re-running `npm install` to update the <code class="path">node_modules</code> folder and then restarting Ghost to make it all take affect.

Remember, by default Ghost stores all your custom data, themes, images, etc in the <code class="path">content</code> directory, so take care to keep this safe! Replace only the files in <code class="path">core</code> and the root, and all will be fine.

## Backing Up <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   To backup all the data from your database, log into your Ghost install and go to <code class="path">/ghost/debug/</code>. Press the export button to download a JSON file containing all of your data. Job done
*   To back up your custom themes and images, you need to take a copy of the files inside of <code class="path">content/themes</code> and <code class="path">content/images</code>

<p class="note"><strong>Note:</strong> You can, if you like, take a copy of your database from <code class="path">content/data</code> but <strong>be warned</strong> you should not do this whilst Ghost is running. Please stop it first.</p>


## How to Upgrade <a id="how-to"></a>

How to upgrade on your local machine

<p class="warn"><strong>WARNING:</strong> Do <strong>NOT</strong> copy and paste the entire Ghost folder over the top of an existing installation on mac. Do <strong>NOT</strong> choose <kbd>REPLACE</kbd> if uploading with Transmit or other FTP software, choose <strong>MERGE</strong>.</p>

*   Download the latest version of Ghost from [Ghost.org](http://ghost.org/download/)
*   Extract the zip file to a temporary location
*   Copy all of the root level files from the latest version. This includes: index.js, package.json, Gruntfile.js, config.example.js, the license and readme files.
*   Next replace the old <code class="path">core</code> directory with the new `core` directory
*   For releases which include update to Casper (the default theme), replace the old <code class="path">content/themes/casper</code> directory with the new one
*   Run `npm install --production`
*   Finally, Restart Ghost so that the changes take effect

## Command line only <a id="cli"></a>

<p class="note"><strong>Back-it-up!</strong> Always perform a backup before upgrading. Read the <a href="#backing-up">backup instructions</a> first!</p>

### Command line only on mac <a id="cli-mac"></a>

The screencast below shows the steps for upgrading Ghost where the zip file has been downloaded to <code class="path">~/Downloads</code> and Ghost is installed in <code class="path">~/ghost</code> <span class="note">**Note:** `~` means the user's home directory on mac and linux</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

The steps in the screencast are:

*   <code class="path">cd ~/Downloads</code> - change directory to the Downloads directory where the latest version of Ghost has been saved
*   `unzip ghost-0.3.1.zip -d ghost-0.3.3` - unzip ghost into the folder <code class="path">ghost-0.3.3</code>
*   <code class="path">cd ghost-0.3.3</code> - change directory into the <code class="path">ghost-0.3.3</code> directory
*   `ls` - show all the files and folders inside this directory
*   `cp *.md *.js *.txt *.json ~/ghost` - copy all .md .js .txt and .json files from this location to <code class="path">~/ghost</code>
*   `cp -R core ~/ghost` - copy the <code class="path">core</code> directory and all of its contents to the <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - copy the <code class="path">casper</code> directory and all of its contents to <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - change directory to the <code class="path">~/ghost</code> directory
*   `npm install --production` - install Ghost
*   `npm start` - start Ghost

### Command line only on linux servers <a id="cli-server"></a>

*   First you'll need to find out the URL of the latest Ghost version. It should be something like `http://ghost.org/zip/ghost-latest.zip`.
*   Fetch the zip file with `wget http://ghost.org/zip/ghost-latest.zip` (or whatever the URL for the latest Ghost version is).
*   Unzip the archive with `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install`
*   Run `npm install --production` to get any new dependencies
*   Finally, restart Ghost so that the changes will take effect

**Additionally**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) also has instructions for upgrading Ghost on linux servers.

### How to update a DigitalOcean Droplet <a id="digitalocean"></a>

<p class="note"><strong>Back-it-up!</strong> Always perform a backup before upgrading. Read the <a href="#backing-up">backup instructions</a> first!</p>

*   First you'll need to find out the URL of the latest Ghost version. It should be something like `http://ghost.org/zip/ghost-latest.zip`.
*   Once you've got the URL for the latest version, in your Droplet console type `cd /var/www/` to change directory to where the Ghost codebase lives.
*   Next, type `wget http://ghost.org/zip/ghost-latest.zip` (or whatever the URL for the latest Ghost version is).
*   Unzip the archive with `unzip -uo ghost-0.3.*.zip -d ghost`
*   Make sure all of the files have the right permissions with `chown -R ghost:ghost ghost/*`
*   Run `npm install` to get any new dependencies
*   Finally, restart Ghost so that the changes take effect using `service ghost restart`

## How to upgrade Node.js to the latest version <a id="upgrading-node"></a>

If you originally installed Node.js from the [Node.js](nodejs.org) website, you can upgrade Node.js to the latest version by downloading and running the latest installer. This will replace your current version with the new version.

If you are on Ubuntu, or another linux distribution which uses `apt-get`, the command to upgrade node is the same as to install: `sudo apt-get install nodejs`.

You do **not** need to restart the server or Ghost.
