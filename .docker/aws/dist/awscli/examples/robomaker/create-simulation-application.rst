**To create a simulation application**

This example creates a simulation application. 

Command::

   aws robomaker create-simulation-application  --name MyRobotApplication --sources s3Bucket=amzn-s3-demo-bucket,s3Key=my-simulation-application.tar.gz,architecture=ARMHF --robot-software-suite name=ROS,version=Kinetic --simulation-software-suite name=Gazebo,version=7 --rendering-engine name=OGRE,version=1.x

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/MyRobotApplication/1551203301792",
    "name": "MyRobotApplication",
    "version": "$LATEST",
    "sources": [
        {
            "s3Bucket": "amzn-s3-demo-bucket",
            "s3Key": "my-simulation-application.tar.gz",
            "architecture": "X86_64"
        }
    ],
    "simulationSoftwareSuite": {
        "name": "Gazebo",
        "version": "7"
    },
    "robotSoftwareSuite": {
        "name": "ROS",
        "version": "Kinetic"
    },
    "renderingEngine": {
        "name": "OGRE",
        "version": "1.x"
    },
    "lastUpdatedAt": 1551203301.0,
    "revisionId": "ee753e53-519c-4d37-895d-65e79bcd1914",
    "tags": {}
  }

