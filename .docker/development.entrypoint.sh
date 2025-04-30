#!/bin/bash


yarn nx reset

# Check if portal service is running by attempting DNS resolution
if getent hosts portal > /dev/null 2>&1; then
  # If portal service exists, set the environment variable
  export portal__url="http://localhost:4175/portal.min.js"
  echo "Portal service detected - enabling portal integration"
fi

# Check if signup form service is running by attempting DNS resolution
if getent hosts signup-form > /dev/null 2>&1; then
  # If signup form service exists, set the environment variable
  export signupForm__url="http://localhost:6174/signup-form.min.js"
  echo "Signup form service detected - enabling signup form integration"
fi

# Check if announcement bar service is running by attempting DNS resolution
if getent hosts announcement-bar > /dev/null 2>&1; then
  # If announcement bar service exists, set the environment variable
  export announcementBar__url="http://localhost:4177/announcement-bar.min.js"
  echo "Announcement bar service detected - enabling announcement bar integration"
fi



# Execute the CMD
exec "$@"
