#!/bin/bash

ver_from="0.0.0"
ver_to="1.0.0"



current_ver=$(tb sql --format JSON "SELECT argMax(version, timestamp) version FROM version_log" | jq -r '.data[0].version')

echo "Current version: $current_ver"

# TODO: If current_ver = '', the DS is empty, we need to initialize
# I am going to leave this command as a placeholder initializer for now:
# tb datasource truncate version_log --yes
# curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d '{"version":"0.0.0","step_id":-1,"message":"Initial version statement"}'


if [ "$ver_from" != "$current_ver" ];
then
  echo "This script is valid only for version $ver_from"
  exit 1
fi

echo "Upgrading from: \"$ver_from\" to: \"$ver_to\""


# Get the highest step done:
query_result=$(tb sql --format JSON "SELECT max(step_id) last_step FROM version_log WHERE version = '$current_ver'")

max_step=$(echo "$query_result" | jq -r '.data[0].last_step')

if [ $max_step -lt 0 ]
then
    # Start at -1
    current_step=-1
else
    current_step=$max_step
fi

# The idea is that a logged step means that it is done already, so we go to the next
current_step=$((current_step+1))

echo "Running from step id $current_step"


max_steps=5
while [ $current_step -le $max_steps ]; do
    echo
    echo "Running step $current_step"
    if [ "$current_step" -le 0 ];then
        # Do stuff...
        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"0.0.0\",\"step_id\":$current_step,\"message\":\"Start update to $ver_to\"}"
    elif [ "$current_step" -le 1 ];
    then
        # Do stuff...
        # Deploy changes
        output=$(tb push --push-deps --only-changes --no-check --yes | tee /dev/tty)

        # If a step fails, the script should stop without logging so it can be retried
        if [ $? -ne 0 ]; then
            echo "Error in step $current_step"
            exit 1
        fi

        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"0.0.0\",\"step_id\":$current_step,\"message\":\"Deploy changes\"}"
    elif [ "$current_step" -le 2 ];
    then
        # Do stuff...
        # Migrate the data
        let

        if [ $? -ne 0 ]; then
            echo "Error in step $current_step"
            exit 1
        fi
        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"0.0.0\",\"step_id\":$current_step,\"message\":\"Deploy changes\"}"
    else
        sleep 1
    fi
    # Go to the next step
    current_step=$((current_step+1))
done


# When all runs ok, finish

