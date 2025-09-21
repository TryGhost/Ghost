**To create a robot application**

This example creates a robot application.

Command::

   aws robomaker create-robot-application --name MyRobotApplication --sources s3Bucket=amzn-s3-demo-bucket,s3Key=my-robot-application.tar.gz,architecture=X86_64 --robot-software-suite name=ROS,version=Kinetic

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551201873931",
    "name": "MyRobotApplication",
    "version": "$LATEST",
    "sources": [
        {
            "s3Bucket": "amzn-s3-demo-bucket",
            "s3Key": "my-robot-application.tar.gz",
            "architecture": "ARMHF"
        }
    ],
    "robotSoftwareSuite": {
        "name": "ROS",
        "version": "Kinetic"
    },
    "lastUpdatedAt": 1551201873.0,
    "revisionId": "1f3cb539-9239-4841-a656-d3efcffa07e1",
    "tags": {}
  }
