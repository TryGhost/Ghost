**To change the settings of an existing environment member for an AWS Cloud9 development environment**

This example changes the settings of the specified existing environment member for the specified AWS Cloud9 development environment.

Command::

  aws cloud9 update-environment-membership --environment-id 8a34f51ce1e04a08882f1e811bd706EX --user-arn arn:aws:iam::123456789012:user/AnotherDemoUser --permissions read-only

Output::

  {
    "membership": {
      "environmentId": "8a34f51ce1e04a08882f1e811bd706EX",
      "userId": "AIDAJ3LOROMOUXTBSU6EX",
      "userArn": "arn:aws:iam::123456789012:user/AnotherDemoUser",
      "permissions": "read-only"
    }
  }