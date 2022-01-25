application_stop.sh (Subfile)
#!/bin/bash
#Stopping existing node servers
echo "Stopping aany existing node servers"
pkill node

before install.sh
#!/bin/bash

#download node and npm
curl -0- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
.~/.nvm/nvm.sh
nvm install node

#create our working directory if it doesn't exist
DIR="home/ec2-user/Ghost-1
if [ -d "$DIR" ]; then
 echo "${DIR} exists"
else
 echo "Creating ${DIR} directory"
 mkdir ${DIR}
