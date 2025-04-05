#!/usr/bin/env bash

if command -v python3 &>/dev/null; then
    echo "✅ Python3 is installed"
else
    echo "Python3 is not installed"
    exit 1
fi

if command -v pip3 &>/dev/null; then
    echo "✅ pip3 is installed"
else
    echo "pip3 is not installed"
    exit 1
fi

{
    python3 -m venv ./.venv && \
    source ./.venv/bin/activate && \
    pip3 install -r ./requirements.txt
} || {
    echo "An error occurred during the setup of the virtual environment or the installation of the requirements."
    exit 1
}
