**To update a robot application**

This example updates a robot application.

Command::

   aws robomaker update-robot-application --application arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551203485821 --sources s3Bucket=amzn-s3-demo-bucket,s3Key=my-robot-application.tar.gz,architecture=X86_64 --robot-software-suite name=ROS,version=Kinetic

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
    "lastUpdatedAt": 1551287993.0,
    "revisionId": "20b5e331-24fd-4504-8b8c-531afe5f4c94"
  }