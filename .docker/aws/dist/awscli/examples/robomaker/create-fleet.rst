**To create a fleet**

This example creates a fleet. It attaches a tag named Region.

Command::

   aws robomaker create-fleet --name MyFleet --tags Region=East

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyOtherFleet/1550771394395",
    "name": "MyFleet",
    "createdAt": 1550771394.0,
    "tags": {
        "Region": "East"
    }
  }