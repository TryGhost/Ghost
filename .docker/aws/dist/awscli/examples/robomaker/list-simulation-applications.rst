**To list simulation applications**

This example lists simulation applications. A maximum of 20 simulation applications will be returned.

Command::

  aws robomaker list-simulation-applications --max-results 20

Output::

  {
    "simulationApplicationSummaries": [
        {
            "name": "AWSRoboMakerObjectTracker-1548959046124_NPvyfcatq",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/AWSRoboMakerObjectTracker-1548959046124_NPvyfcatq/1548959170096",
            "version": "$LATEST",
            "lastUpdatedAt": 1548959170.0
        },
        {
            "name": "RoboMakerHelloWorldSimulation",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/RoboMakerHelloWorldSimulation/1546541198985",
            "version": "$LATEST",
            "lastUpdatedAt": 1546541198.0
        },
        {
            "name": "RoboMakerObjectTrackerSimulation",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/RoboMakerObjectTrackerSimulation/1545846795615",
            "version": "$LATEST",
            "lastUpdatedAt": 1545847405.0
        },
        {
            "name": "RoboMakerVoiceInteractionSimulation",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/RoboMakerVoiceInteractionSimulation/1546537100507",
            "version": "$LATEST",
            "lastUpdatedAt": 1546540352.0
        },
        {
            "name": "AWSRoboMakerCloudWatch-1547663411642_0LIt6D1h6",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/AWSRoboMakerCloudWatch-1547663411642_0LIt6D1h6/1547663521470",
            "version": "$LATEST",
            "lastUpdatedAt": 1547663521.0
        },
        {
            "name": "AWSRoboMakerDeepRacer-1545848257672_1YZCaieQ-",
            "arn": "arn:aws:robomaker:us-west-2:111111111111:simulation-application/AWSRoboMakerDeepRacer-1545848257672_1YZCaieQ-/1545848370525",
            "version": "$LATEST",
            "lastUpdatedAt": 1545848370.0
        }
    ]
  }