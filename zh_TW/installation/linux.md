---
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /zh_TW/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Installing on Linux <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Install Node

*   Either download the `.tar.gz` archive from [http://nodejs.org](http://nodejs.org), or you may prefer to follow the instructions on how to [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) instead.
*   Double check that you have Node and npm installed by typing `node -v` and `npm -v` into a terminal window

### Install and Run Ghost


**If you are using Linux on your desktop follow these steps:**

*   On the [downloads page](https://ghost.org/download/), press the button to download the latest zip file & then extract the file to the location you want to run Ghost from


**If you are using Linux as a guest OS or through SSH and only have the terminal, then:**

*   Use the following command to download the latest release of Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Unzip the archive and change into the directory using the following:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**After you successfully extracted Ghost open a terminal, if you haven't already, then:**

*   Change into the directory you extracted Ghost to with the following command:

    ```
    $ cd /path/to/ghost
    ```

*   To install Ghost type:

    ```
    npm install --production
    ```
    <span class="note">note the two dashes</span>

*   When npm is finished installing, type the following to start Ghost in development mode:

    ```
    $ npm start
    ```

*   Ghost will now be running on **127.0.0.1:2368**<br />
    <span class="note">You can adjust the IP-address and port in **config.js**</span>

*   In a browser, navigate to [http://127.0.0.1:2368](http://127.0.0.1:2368) to see your newly setup Ghost blog
*   Change the url to [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) and create your admin user to login to the Ghost admin
