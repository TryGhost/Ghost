**To describe a simulation application**

This example describes a simulation application.

Command::

   aws robomaker describe-simulation-application --application arn:aws:robomaker:us-west-2:111111111111:simulation-application/MySimulationApplication/1551203427605

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
    "revisionId": "783674ab-b7b8-42d9-b01f-9373907987e5",
    "lastUpdatedAt": 1551203427.0,
    "tags": {}
  }