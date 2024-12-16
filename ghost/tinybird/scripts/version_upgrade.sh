#!/bin/bash

ver_from="0.0.0"
ver_to="1.0.0"


current_ver=$(tb sql --format JSON "SELECT argMax(version, timestamp) version FROM version_log" | jq -r '.data[0].version')

echo "Current version: $current_ver"

# TODO: If current_ver = '', the DS is empty, we need to initialize
# I am going to leave this command as a placeholder initializer for now:
# tb datasource truncate version_log --yes
# curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d '{"version":"$ver_from","step_id":-1,"message":"Initial version statement"}'


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

# Migration plan:
# analytics_sources.pipe should not really be iterated, as the output 
# does not change and thus does not require a migration
# 1. Start (can be removed)
# 2. Populate analytics_sessions_mv__v1 with analytics_sessions_v1
# 3. Populate analytics_pages_mv__v1 with analytics_pages_v1

max_steps=5
while [ $current_step -le $max_steps ]; do
    echo
    echo "Running step $current_step"
    if [ "$current_step" -le 0 ];then
        # Do stuff...

        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"$ver_from\",\"step_id\":$current_step,\"message\":\"Start update to $ver_to\"}"
    elif [ "$current_step" -le 1 ];
    then
        # Do stuff...
        step_message="Populate analytics_sessions_mv__v1 with analytics_sessions_v1"
        # Migrate the data
        output=$(tb pipe populate --truncate --wait analytics_sessions_v1 | tee /dev/tty)

        # Check that it ran ok
        if [ $? -ne 0 ]; then
            echo "Error in step $current_step"
            exit 1
        fi
        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"$ver_from\",\"step_id\":$current_step,\"message\":\"$step_message\"}"
    elif [ "$current_step" -le 2 ];
    then
        # Do stuff...
        step_message="Populate analytics_pages_mv__v1 with analytics_pages_v1"
        # Migrate the data
        output=$(tb pipe populate --truncate --wait analytics_pages_v1 | tee /dev/tty)

        # Check that it ran ok
        if [ $? -ne 0 ]; then
            echo "Error in step $current_step"
            exit 1
        fi
        # Log the stuff you've done
        curl -X POST 'https://api.tinybird.co/v0/events?name=version_log' -H "Authorization: Bearer $TB_TOKEN" -d "{\"version\":\"$ver_from\",\"step_id\":$current_step,\"message\":\"$step_message\"}"
    else
        # Empty step for testing
        sleep 1
    fi
    # Go to the next step
    current_step=$((current_step+1))
done


# When all runs ok, finish

