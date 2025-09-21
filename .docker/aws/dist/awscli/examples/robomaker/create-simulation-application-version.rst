**To create a simulation application version**

This example creates a robot application version.

Command::

   aws robomaker create-simulation-application-version --application arn:aws:robomaker:us-west-2:111111111111:robot-application/MySimulationApplication/1551203427605

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/MyRobotApplication/1551203427605",
    "name": "MyRobotApplication",
    "version": "1",
    "sources": [
        {
            "s3Bucket": "amzn-s3-demo-bucket",
            "s3Key": "my-simulation-application.tar.gz",
            "etag": "00d8a94ff113856688c4fce618ae0f45-94",
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
   "lastUpdatedAt": 1551203853.0,
    "revisionId": "ee753e53-519c-4d37-895d-65e79bcd1914",
    "tags": {}
  }
  
