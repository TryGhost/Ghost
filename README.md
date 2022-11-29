    git clone --recurse-submodules git@github.com:IIGdevelopment/core.git kyivindependent
    cd kyivindependent
    git submodule add -f git@github.com:IIGdevelopment/theme-kyivindependent.git theme
    cd theme
    git remote rename origin upstream
    git remote add origin git@github.com:IIGdevelopment/theme-kyivindependent.git
    cd ../
    git remote rename origin upstream
    git remote add origin git@github.com:IIGdevelopment/core-kyivindependent.git
    git add -A
    git commit -m "🚀 Initial commit"
    git push origin main

    yarn global add knex-migrator ember-cli
    yarn setup
    yarn dev

    yarn main