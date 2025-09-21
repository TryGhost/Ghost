**To create a robot application version**

This example creates a robot application version.

Command::

   aws robomaker create-robot-application-version --application arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551201873931

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551201873931",
    "name": "MyRobotApplication",
    "version": "1",
    "sources": [
        {
            "s3Bucket": "amzn-s3-demo-bucket",
            "s3Key": "my-robot-application.tar.gz",
            "etag": "f8cf5526f1c6e7b3a72c3ed3f79c5493-70",
            "architecture": "ARMHF"
        }
    ],
    "robotSoftwareSuite": {
        "name": "ROS",
        "version": "Kinetic"
    },
    "lastUpdatedAt": 1551201873.0,
    "revisionId": "9986bb8d-a695-4ab4-8810-9f4a74d1aa00"
    "tags": {}
  }
  
