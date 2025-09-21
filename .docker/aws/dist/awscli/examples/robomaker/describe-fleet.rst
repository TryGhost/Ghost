**To describe a fleet**

The following ``describe-fleet`` example retrieves the details for the specified fleet. ::

    aws robomaker describe-fleet \
        --fleet arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1550771358907

Output::

    {
        "name": "MyFleet",
        "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
        "robots": [
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1540834232469",
                "createdAt": 1540834232.0
            },
            {
                "arn": "arn:aws:robomaker:us-west-2:111111111111:robot/MyOtherRobot/1540829698778",
                "createdAt": 1540829698.0
            }
        ],
        "createdAt": 1539894765.0,
        "lastDeploymentStatus": "Succeeded",
        "lastDeploymentJob": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-xl8qssl6pbcn",
        "lastDeploymentTime": 1551218369.0,
        "tags": {}
    }
