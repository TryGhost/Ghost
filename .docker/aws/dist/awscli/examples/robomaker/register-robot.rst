**To register a robot**

This example registers a robot to a fleet.

Command::

   aws robomaker register-robot --fleet arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1550771358907 --robot arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1550772324398

Output::

  {
    "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1550771358907",
    "robot": "arn:aws:robomaker:us-west-2:111111111111:robot/MyRobot/1550772324398"
  }