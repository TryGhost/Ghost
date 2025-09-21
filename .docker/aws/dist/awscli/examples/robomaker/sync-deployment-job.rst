**To sync a deployment job**

This example synchronizes a deployment job.

Command::

   aws robomaker sync-deployment-job --fleet arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/Trek/1539894765711

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-09ccxs3tlfms",
    "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
    "status": "Pending",
    "deploymentConfig": {
        "concurrentDeploymentPercentage": 20,
        "failureThresholdPercentage": 25
    },
    "deploymentApplicationConfigs": [
        {
            "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1546541208251",
            "applicationVersion": "1",
            "launchConfig": {
                "packageName": "hello_world_simulation",
                "launchFile": "empty_world.launch"
            }
        }
    ],
    "createdAt": 1551286954.0
  }