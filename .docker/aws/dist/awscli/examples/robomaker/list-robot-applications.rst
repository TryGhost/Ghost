**To list robot applications**

This example lists robot applications. Results are limited to 20 robot applications.

Command::

  aws robomaker list-robot-applications --max-results 20

Output::

  {
    "robotApplicationSummaries": [
        {
            "name": "MyRobot",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobot/1546537110575",
            "version": "$LATEST",
            "lastUpdatedAt": 1546540372.0
        },
        {
            "name": "AnotherRobot",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/AnotherRobot/1546541208251",
            "version": "$LATEST",
            "lastUpdatedAt": 1546541208.0
        },
        {
            "name": "MySuperRobot",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MySuperRobot/1547663517377",
            "version": "$LATEST",
            "lastUpdatedAt": 1547663517.0
        }
    ]
  }