**To get status information for an AWS Cloud9 development environment**

This example gets status information for the specified AWS Cloud9 development environment.

Command::

  aws cloud9 describe-environment-status --environment-id 685f892f431b45c2b28cb69eadcdb0EX

Output::

  {
    "status": "ready",
    "message": "Environment is ready to use"
  }