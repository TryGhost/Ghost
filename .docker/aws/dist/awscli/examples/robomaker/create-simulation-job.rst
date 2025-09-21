**To create a simulation job**

This example creates a simulation job. It uses a robot application and a simulation application.

Command::

   aws robomaker create-simulation-job --max-job-duration-in-seconds 3600 --iam-role arn:aws:iam::111111111111:role/AWSRoboMakerCloudWatch-154766341-SimulationJobRole-G0OBWTQ8YBG6 --robot-applications application=arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551203485821,launchConfig={packageName=hello_world_robot,launchFile=rotate.launch} --simulation-applications application=arn:aws:robomaker:us-west-2:111111111111:simulation-application/MySimulationApplication/1551203427605,launchConfig={packageName=hello_world_simulation,launchFile=empty_world.launch} --tags Region=North

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-job/sim-w7m68wpr05h8",
    "status": "Pending",
    "lastUpdatedAt": 1551213837.0,
    "failureBehavior": "Fail",
    "clientRequestToken": "b283ccce-e468-43ee-8642-be76a9d69f15",
    "maxJobDurationInSeconds": 3600,
    "simulationTimeMillis": 0,
    "iamRole": "arn:aws:iam::111111111111:role/MySimulationRole",
    "robotApplications": [
        {
            "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/MyRobotApplication/1551203485821",
            "applicationVersion": "$LATEST",
            "launchConfig": {
                "packageName": "hello_world_robot",
                "launchFile": "rotate.launch"
            }
        }
    ],
    "simulationApplications": [
        {
            "application": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/MySimulationApplication/1551203427605",
            "applicationVersion": "$LATEST",
            "launchConfig": {
                "packageName": "hello_world_simulation",
                "launchFile": "empty_world.launch"
            }
        }
    ],
    "tags": {
        "Region": "North"
    }
  }