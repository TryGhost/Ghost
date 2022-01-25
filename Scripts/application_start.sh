#!/bin/bash
sudo chmod -R 777 /home/ec2-user/Ghost-1-app
#navigate into our working directory where we have all our github files
cd /home/ec2-user/Ghost-app

#add npm and node to path
export NVM_DIR"$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # loads nvm
[ -s "$NVM_DIR/bash_completion" ] && "$NVM_DIR/bash_completion" # loads nvm bash_completion (node is in

#install node modules
npm install

#start our node appin the background
node pp.js > app.out.log 2> app.err.log < /dev/null &
