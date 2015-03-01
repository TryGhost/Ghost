---
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
canonical: http://support.ghost.org/troubleshooting/
redirectToCanonical: true
---


# Troubleshooting & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' doesn't appear in my $PATH</dt>
    <dd>You can add it by doing the following:
        <ul>
            <li>In your terminal window type <code>cd ~</code>, this will take you to your home directory</li>
            <li>Now type <code>ls -al</code> to show all the files and folders in this directory, including hidden ones</li>
            <li>You should see a file called <code class="path">.profile</code> or <code class="path">.bash_profile</code> if not type <code>touch .bash_profile</code> to create a file</li>
            <li>Next, type <code>open -a Textedit .bash_profile</code> to open the file with Textedit.</li>
            <li>Add <code>export PATH=$PATH:/usr/local/bin/</code> at the end of the file and save it</li>
            <li>This new setting will get loaded when a new terminal starts, so open a new terminal tab or window and type <code>echo $PATH</code> to see that '/usr/local/bin/' is now present.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 doesn't install</dt>
    <dd>
        <p>The SQLite3 package comes with pre-built binaries for the most common architectures. If you are using a less popular linux or other unix flavor, you may find that SQLite3 will give you a 404 as it cannot find a binary for your platform.</p>
        <p>This can be fixed by forcing SQLite3 to compile. This will require python & gcc. Try it out by running <code>npm install sqlite3 --build-from-source</code></p>
        <p>If it won't build you're probably missing one of the python or gcc dependencies, on linux try running <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> and <code>sudo apt-get install python-software-properties python g++ make</code> before retrying the build from source.</p>
        <p>For more information about building the binaries please see: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Once you have successfully built a binary for your platform, please follow the <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instructions here</a> to submit the binary to the node-sqlite project, so that future users won't have the same problem.</p>
    </dd>
    <dt id="image-uploads">I can't upload images</dt>
    <dd>
        <p>If you're on a DigitalOcean Droplet setup when Ghost was at v0.3.2, or you're using nginx on some other platform, you may find you cannot upload images.</p>
        <p>What's actually happening, is you cannot upload images bigger than 1MB (try a small image, it should work). That's a pretty small limit!</p>
        <p>To increase the limit you need to edit your nginx config file, and set the limit to something else.</p>
        <ul>
            <li>Log into your server, and type <code>sudo nano /etc/nginx/conf.d/default.conf</code> to open your config file.</li>
            <li>After the <code>server_name</code> line, add the following: <code>client_max_body_size 10M;</code></li>
            <li>Finally, press <kbd>ctrl</kbd> + <kbd>x</kbd> to exit. Nano will ask you if you want to save, type <kbd>y</kbd> for yes, and press <kbd>enter</kbd> to save the file.</li>
        </ul>
    </dd>
</dl>

