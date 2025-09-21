**To describe a robot**

This example describes a robot.

Command::

   aws robomaker describe-robot --robot arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1550772324398

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1550772324398",
    "name": "MyRobot",
    "status": "Available",
    "greengrassGroupId": "0f728a3c-7dbf-4a3e-976d-d16a8360caba",
    "createdAt": 1550772325.0,
    "architecture": "ARMHF",
    "tags": {
        "Region": "East"
    }
  }