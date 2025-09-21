**To create a deployment job**

This example creates a deployment job for fleet MyFleet. It includes an environment variable named "ENVIRONMENT". 
It also attaches a tag named "Region". 

Command::

   aws robomaker create-deployment-job --deployment-config concurrentDeploymentPercentage=20,failureThresholdPercentage=25 --fleet arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/Trek/1539894765711 --tags Region=West --deployment-application-configs application=arn:aws:robomaker:us-west-2:111111111111:robot-application/RoboMakerVoiceInteractionRobot/1546537110575,applicationVersion=1,launchConfig={environmentVariables={ENVIRONMENT=Beta},launchFile=await_commands.launch,packageName=voice_interaction_robot}

Output::

  {
    "arn": "arn:aws:robomaker:us-west-2:111111111111:deployment-job/sim-0974h36s4v0t",
    "fleet": "arn:aws:robomaker:us-west-2:111111111111:deployment-fleet/MyFleet/1539894765711",
    "status": "Pending",
    "deploymentApplicationConfigs": [
        {
            "application": "arn:aws:robomaker:us-west-2:111111111111:robot-application/RoboMakerVoiceInteractionRobot/1546537110575",
            "applicationVersion": "1",
            "launchConfig": {
                "packageName": "voice_interaction_robot",
                "launchFile": "await_commands.launch",
                "environmentVariables": {
                    "ENVIRONMENT": "Beta"
                }
            }
        }
    ],
    "createdAt": 1550770236.0,
    "deploymentConfig": {
        "concurrentDeploymentPercentage": 20,
        "failureThresholdPercentage": 25
    },
    "tags": {
        "Region": "West"
    }
  }