**To describe your placement groups**

This example command describes all of your placement groups.

Command::

  aws ec2 describe-placement-groups

Output::

  {
      "PlacementGroups": [
          {
              "GroupName": "my-cluster",
              "State": "available",
              "Strategy": "cluster"
          },
          ...
      ]
  }
