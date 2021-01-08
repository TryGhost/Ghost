#!/bin/bash
set -ea

if [ ! -d "node_modules" ] || [ ! "$(ls -qAL node_modules 2>/dev/null)" ]; then

echo "node_modules not installed, assuming a fresh install. Performing initial setup..."
    # Make sure dependencies are installed
    echo "Installing global dependencies"
    yarn global add knex-migrator grunt-cli ember-cli

    # Set Ghost origin as upstream
    echo "Setting Ghost origin as upstream"
    git remote rename origin upstream

    # Set your Ghost fork as the origin
    echo "Setting your fork as origin"
    git remote add origin $GHOST_FORK_NAME

    cd /ghost/core/client

    # Set Ghost origin as upstream
    echo "Setting Ghost-Admin origin as upstream"
    git remote rename origin upstream

    # Set your Ghost-Admin fork as the origin
    echo "Setting your fork as origin"
    git remote add origin $GHOST_ADMIN_FORK_NAME

    cd /ghost/content/themes/casper

    # Set Ghost origin as upstream
    echo "Setting Casper origin as upstream"
    git remote rename origin upstream

    # Set your Ghost Casper theme fork as the origin
    echo "Setting your fork as origin"
    git remote add origin $GHOST_CASPER_FORK_NAME

    cd /ghost

    # Install project depedencies, perform initial setup
    echo "Performing initial install and setup"
    yarn install && yarn setup

    echo "Setting ghost config to listen on 0.0.0.0"
    cp /usr/local/config.development.json /ghost/

    echo "Initial configuration complete. Run grunt dev to get started..."
fi

exec "$@"