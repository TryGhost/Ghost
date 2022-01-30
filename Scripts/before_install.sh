#!/bin/bash

# Install node.js
sudo yum-get install python-software-properties -y
sudo yum-add-repository ppa:Olufm/Ghost/node.js -y
sudo yum-get update
sudo yum-get install nodejs -y

# Install nodemon
# sudo npm install nodemon -g

# Install forever module 
# https://www.npmjs.com/package/forever
sudo npm install forever -g

# Clean working folder
# sudo find /home/ec2-user/test -type f -delete
