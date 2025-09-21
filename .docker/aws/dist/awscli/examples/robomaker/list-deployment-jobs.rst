**To list deployment jobs**

The following ``list-deployment-jobs`` example retrieves a list of deployment jobs. ::

    aws robomaker list-deployment-jobs

Output::

    {
        "deploymentJobs": [
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/sim-6293szzm56rv",
                "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
                "status": "InProgress",
                "deploymentApplicationConfigs": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/HelloWorldRobot/1546537110575",
                        "applicationVersion": "1",
                        "launchConfig": {
                            "packageName": "hello_world_robot",
                            "launchFile": "rotate.launch",
                            "environmentVariables": {
                                "ENVIRONMENT": "Desert"
                            }
                        }
                    }
                ],
                "deploymentConfig": {
                    "concurrentDeploymentPercentage": 20,
                    "failureThresholdPercentage": 25
                },
                "createdAt": 1550689373.0
            },
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-4w4g69p25zdb",
                "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
                "status": "Pending",
                "deploymentApplicationConfigs": [
                    {
                        "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/AWSRoboMakerHelloWorld-1544562726923_YGHM_sh5M/1544562822877",
                        "applicationVersion": "1",
                        "launchConfig": {
                            "packageName": "fail",
                            "launchFile": "fail"
                        }
                    }
                ],
                "deploymentConfig": {
                    "concurrentDeploymentPercentage": 20,
                    "failureThresholdPercentage": 25
                },
                "failureReason": "",
                "failureCode": "",
                "createdAt": 1544719763.0
            }
        ]
    }