**To list tags for a resource**

This example lists tags for an AWS RoboMaker resource. 

Command::

  aws robomaker list-tags-for-resource --resource-arn "arn:aws:robomaker:us-west-2:111111111111:robot/Robby_the_Robot/1544035373264"

Output::

  {
    "tags": {
        "Region": "North",
        "Stage": "Initial"
    }
  }