**To describe a deployment job**

The following ``describe-deployment-job`` example retrieves the details about the specified deployment job. ::

    aws robomaker describe-deployment-job \
        --job arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-xl8qssl6pbcn

Output::

    {
        "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-xl8qssl6pbcn",
        "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/Trek/1539894765711",
        "status": "InProgress",
        "deploymentConfig": {
            "concurrentDeploymentPercentage": 20,
            "failureThresholdPercentage": 25
        },
        "deploymentApplicationConfigs": [
            {
                "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/RoboMakerHelloWorldRobot/1546541208251",
                "applicationVersion": "1",
                "launchConfig": {
                    "packageName": "hello_world_robot",
                    "launchFile": "rotate.launch"
                }
            }
        ],
        "createdAt": 1551218369.0,
        "robotDeploymentSummary": [
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1540834232469",
                "deploymentStartTime": 1551218376.0,
                "status": "Deploying",
                "progressDetail": {}
            }
        ],
        "tags": {}
    }
