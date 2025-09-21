**To update a simulation application**

This example updates a simulation application.

Command::

   aws robomaker update-simulation-application --application arn:aws:robomaker:us-west-2:111111111111:simulation-application/MySimulationApplication/1551203427605 --sources s3Bucket=amzn-s3-demo-bucket,s3Key=my-simulation-application.tar.gz,architecture=X86_64 --robot-software-suite name=ROS,version=Kinetic --simulation-software-suite name=Gazebo,version=7 --rendering-engine name=OGRE,version=1.x

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/MySimulationApplication/1551203427605",
    "name": "MySimulationApplication",
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
    "lastUpdatedAt": 1551289361.0,
    "revisionId": "4a22cb5d-93c5-4cef-9311-52bdd119b79e"
  }