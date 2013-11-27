---
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Installing on Linux <a id="install-linux"></a>

### Install Node

*   Either download the `.tar.gz` archive from [http://nodejs.org](http://nodejs.org), or you may prefer to follow the instructions on how to [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) instead.
*   Double check that you have Node and npm installed by typing `node -v` and `npm -v` into a terminal window

### Install and Run Ghost

*   Log in to [http://ghost.org](http://ghost.org), and then click the blue 'Download Ghost Source Code' button
*   On the downloads page, press the button to download the latest zip file & then extract the file to the location you want to run Ghost from
*   In a terminal window, change directory to the root of the extracted Ghost folder
*   In the terminal type `npm install --production` <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   In a browser, navigate to <code class="path">127.0.0.1:2368</code> to see your newly setup Ghost blog
*   Change the url to <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin

**If you are using Linux as a guest OS or through SSH and only have the terminal, then:**

*   Use the following command to download the latest release of Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Unzip the archive and change into the directory using the following:

    ```
    $ unzip -uo ghost.zip -d ghost`; `cd ghost`
    ```

*   Type `npm install --production` to install Ghost <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   Ghost will now be running on localhost

