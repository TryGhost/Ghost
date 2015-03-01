---
lang: example_translation
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /example_translation/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---
## Getting Ghost Live <a id="deploy"></a>

So you're ready to get Ghost live? Excellent!

The first decision you need to make, is whether you want to install and setup Ghost yourself, or whether you prefer to use an installer.

### Installers

There are a couple of options for simple installers at the moment:

*   Deploy to the cloud with [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Launch Ghost with [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Get up and running with a [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Manual Setup

You're going to need a hosting package that already has, or will allow you to install [Node.js](http://nodejs.org).
    This means something like a cloud ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) or other package that has SSH (terminal) access & will allow you to install Node.js. There are plenty around and they can be very cheap.

What won't work at the moment, is cPanel-style shared hosting as this is usually aimed specifically at hosting PHP. Although some offer Ruby, and so may offer Node.js in the future as they are somewhat similar.

<p>Unfortunately, many of the Node-specific cloud hosting solutions such as **Nodejitsu** & **Heroku** are **NOT** compatible with Ghost. They will work at first, but they will delete your files and therefore all image uploads and your database will disappear. Heroku supports MySQL so you could use this, but you will still lose any uploaded images.

The following links contain instructions on how to get up and running with:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## Making Ghost run forever

The previously described method to start Ghost is `npm start`. This is a good way to do local develpment and tests, but if you start Ghost using the command line it will stop whenever you are closing the terminal window or log out from SSH. To prevent Ghost from stopping you have to run Ghost as a service. There are two ways to accomplish this.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

You can use `forever` to run Ghost as a background task. `forever` will also take care of your Ghost installation and it will restart the node process if it crashes.

*   To install `forever` type `npm install forever -g`
*   To start Ghost using `forever` from the Ghost installation directory type `NODE_ENV=production forever start index.js`
*   To stop Ghost type `forever stop index.js`
*   To check if Ghost is currently running type `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Popular Linux distributions&mdash;such as Fedora, Debian, and Ubuntu&mdash;maintain a package for Supervisor: A process control system which allows you to run Ghost at startup without using init scripts. Unlike an init script, Supervisor is portable between Linux distributions and versions.

*   [Install Supervisor](http://supervisord.org/installing.html) as required for your Linux distribution. Typically, this will be:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Most other distributions: `easy_install supervisor`
*   Ensure that Supervisor is running, by running `service supervisor start`
*   Create the startup script for your Ghost installation. Typically this will go in `/etc/supervisor/conf.d/ghost.conf` For example:

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   Start Ghost using Supervisor: `supervisorctl start ghost`
*   To stop Ghost: `supervisorctl stop ghost`

You can see the [documentation for Supervisor](http://supervisord.org) for more information.

### Init Script <a id="init-script"></a>

Linux systems use init scripts to run on system boot. These scripts exist in /etc/init.d. To make Ghost run forever and even survive a reboot you could set up an init script to accomplish that task. The following example will work on Ubuntu and was tested on **Ubuntu 12.04**.

*   Create the file /etc/init.d/ghost with the following command:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Open the file with `nano /etc/init.d/ghost` and check the following:
*   Change the `GHOST_ROOT` variable to the path where you installed Ghost
*   Check if the `DAEMON` variable is the same as the output of `which node`
*   The Init script runs with it's own Ghost user and group on your system, let's create them with the following:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Let's also make sure the Ghost user can access the installation:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Change the execution permission for the init script by typing

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Now you can control Ghost with the following commands:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   To start Ghost on system start the newly created init script has to be registered for start up.
    Type the following two commands in command line:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Let's make sure your user can change files, config.js for example in the Ghost directory, by assigning you to the ghost group:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   If you now restart your server Ghost should already be running for you.


## Setting up Ghost with a domain name <a id="nginx-domain"></a>

If you have setup up Ghost to run forever you can also setup a web server as a proxy to serve your blog with your domain.
In this example we assume you are using **Ubuntu 12.04** and use **nginx** as a web server.
It also assumes that Ghost is running in the background with one of the above mentioned ways.

*   Install nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">This will install nginx and setup all necessary directories and basic configurations.</span>

*   Configure your site

    *   Create a new file in `/etc/nginx/sites-available/ghost.conf`
    *   Open the file with a text editor (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        and paste the following

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   Change `server_name` to your domain
    *   Symlink your configuration in `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Restart nginx

    ```
    $ sudo service nginx restart
    ```

## Setting up Ghost with SSL <a id="ssl"></a>

After setting up a custom domain it is a good idea to secure the admin interface or maybe your whole blog using HTTPS. It is advisable to protect the admin interface with HTTPS because username and password are going to be transmitted in plaintext if you do not enable encryption.

The following example will show you how to set up SSL. We assume, that you have followed this guide so far and use nginx as your proxy server. A setup with another proxy server should look similar.

First you need to obtain a SSL certificate from a provider you trust. Your provider will guide you through the process of generating your private key and a certificate signing request (CSR). After you have received the certificate file you have to copy the CRT file from your certificate provider and the KEY file which is generated during issuing the CSR to the server.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

After these two files are in place you need to update your nginx configuration.

*   Open the nginx configuration file with a text editor (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Add the settings indicated with a plus to your configuration file:

    ```
     server {
         listen 80;
    +    listen 443 ssl;
         server_name example.com;
    +    ssl_certificate        /etc/nginx/ssl/server.crt;
    +    ssl_certificate_key    /etc/nginx/ssl/server.key;
         ...
         location / {
    +       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    +       proxy_set_header Host $http_host;
    +       proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:2368;
            ...
         }
     }
    ```

    *   Restart nginx

    ```
    $ sudo service nginx restart
    ```

After these steps you should be able to reach the admin area of your blog using a secure HTTPS connection. If you want to force all your traffic to use SSL it is possible to change the protocol of the url setting in your config.js file to https (e.g.: `url: 'https://my-ghost-blog.com'`). This will force the use of SSL for frontend and admin. All requests sent over HTTP will be redirected to HTTPS. If you include images in your post that are retrieved from domains that are using HTTP an 'insecure content' warning will appear. Scripts and fonts from HTTP domains will stop working.

In most cases you'll want to force SSL for the administration interface and serve the frontend using HTTP and HTTPS. To force SSL for the admin area the option `forceAdminSSL: true` was introduced.

If you need further information on how to set up SSL for your proxy server the official SSL documention of [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) and [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) are a perfect place to start.
