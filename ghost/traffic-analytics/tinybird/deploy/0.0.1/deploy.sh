#!/bin/bash

./scripts/unsafe_delete_all_pipes.sh
./scripts/unsafe_delete_all_mvs.sh

tb deploy
