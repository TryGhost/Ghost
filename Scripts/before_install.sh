#!/bin/bash

# Install node.js
sudo yum install python-software-properties -y
yum-config-manager --add-repo https://github.com/OlufM/Ghost.git
sudo yum update
sudo yum install nodejs -y

# Install nodemon
# sudo npm install nodemon -g

# Install forever module 
# https://www.npmjs.com/package/forever
sudo npm install forever -g

# Clean working folder
# sudo find /home/ec2-user/test -type f -delete
