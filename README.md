    git clone --recurse-submodules https://github.com/IIGdevelopment/core ghost
    cd ghost
    git submodule add -f git@github.com:IIGdevelopment/theme-kyivindependent.git theme
    git remote rename origin upstream
    git remote add origin https://github.com/IIGdevelopment/core-kyivindependent
    git add -A
    git commit -m "🚀 Initial commit"
    git push origin main

    yarn global add knex-migrator ember-cli
    yarn setup
    yarn dev

    yarn main