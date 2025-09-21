**To get information about a deployment instance**

The following ``get-deployment-instance`` example displays information about a deployment instance that is associated with the specified deployment. ::

    aws deploy get-deployment-instance --deployment-id d-QA4G4F9EX --instance-id i-902e9fEX

Output::

    {
        "instanceSummary": {
            "instanceId": "arn:aws:ec2:us-east-1:80398EXAMPLE:instance/i-902e9fEX",
            "lifecycleEvents": [
                {
                    "status": "Succeeded",
                    "endTime": 1408480726.569,
                    "startTime": 1408480726.437,
                    "lifecycleEventName": "ApplicationStop"
                },
                {
                    "status": "Succeeded",
                    "endTime": 1408480728.016,
                    "startTime": 1408480727.665,
                    "lifecycleEventName": "DownloadBundle"
                },
                {
                    "status": "Succeeded",
                    "endTime": 1408480729.744,
                    "startTime": 1408480729.125,
                    "lifecycleEventName": "BeforeInstall"
                },
                {
                    "status": "Succeeded",
                    "endTime": 1408480730.979,
                    "startTime": 1408480730.844,
                    "lifecycleEventName": "Install"
                },
                {
                    "status": "Failed",
                    "endTime": 1408480732.603,
                    "startTime": 1408480732.1,
                    "lifecycleEventName": "AfterInstall"
                },
                {
                    "status": "Skipped",
                    "endTime": 1408480732.606,
                    "lifecycleEventName": "ApplicationStart"
                },
                {
                    "status": "Skipped",
                    "endTime": 1408480732.606,
                    "lifecycleEventName": "ValidateService"
                }
            ],
            "deploymentId": "d-QA4G4F9EX",
            "lastUpdatedAt": 1408480733.152,
            "status": "Failed"
        }
    }
