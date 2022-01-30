#!/bin/bash

# Install node.js
sudo yum install python 3
sudo yum-config-manager --disable github.com_OlufM_Ghost.git
sudo yum update
sudo yum install nodejs -y

# Install nodemon
# sudo npm install nodemon -g

# Install forever module 
# https://www.npmjs.com/package/forever
sudo npm install forever -g

# Clean working folder
# sudo find /home/ec2-user/test -type f -delete
