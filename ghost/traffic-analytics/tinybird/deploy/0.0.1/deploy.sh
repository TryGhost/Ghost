#!/bin/bash

./scripts/unsafe_delete_all_pipes.sh --force
./scripts/unsafe_delete_all_mvs.sh --force

tb deploy
