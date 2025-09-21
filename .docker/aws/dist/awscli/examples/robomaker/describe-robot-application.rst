**To describe a robot application**

This example describes a robot application.

Command::

   aws robomaker describe-robot-application --application arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551203485821

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551203485821",
    "name": "MyRobotApplication",
    "version": "$LATEST",
    "sources": [
        {
            "s3Bucket": "amzn-s3-demo-bucket",
            "s3Key": "my-robot-application.tar.gz",
            "architecture": "X86_64"
        }
    ],
    "robotSoftwareSuite": {
        "name": "ROS",
        "version": "Kinetic"
    },
    "revisionId": "e72efe0d-f44f-4333-b604-f6fa5c6bb50b",
    "lastUpdatedAt": 1551203485.0,
    "tags": {}
  }