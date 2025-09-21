**To list fleets**

This example lists fleets. A maximum of 20 fleets will be returned.

Command::

  aws robomaker list-fleets --max-items 20

Output::

  {
    "fleetDetails": [
        {
            "name": "Trek",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
            "createdAt": 1539894765.0,
            "lastDeploymentStatus": "Failed",
            "lastDeploymentJob": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/deployment-4w4g69p25zdb",
            "lastDeploymentTime": 1544719763.0
        }
    ]
  }