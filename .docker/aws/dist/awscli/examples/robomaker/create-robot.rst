**To create a robot**

This example creates a robot. It uses the ARMHF architecture. It also attaches a tag named Region.

Command::

   aws robomaker create-robot --name MyRobot --architecture ARMHF --greengrass-group-id 0f728a3c-7dbf-4a3e-976d-d16a8360caba --tags Region=East

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1550772324398",
    "name": "MyRobot",
    "createdAt": 1550772325.0,
    "greengrassGroupId": "0f728a3c-7dbf-4a3e-976d-d16a8360caba",
    "architecture": "ARMHF",
    "tags": {
        "Region": "East"
    }
  }