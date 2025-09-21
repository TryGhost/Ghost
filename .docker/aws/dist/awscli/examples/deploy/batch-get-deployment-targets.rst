**To retrieve the targets associated with a deployment**

The following ``batch-get-deployment-targets`` example returns information about one of the targets associated with the specified deployment. ::

    aws deploy batch-get-deployment-targets \
        --deployment-id "d-1A2B3C4D5" \
        --target-ids "i-01a2b3c4d5e6f1111"

Output::

    {
        "deploymentTargets": [
            {
                "deploymentTargetType": "InstanceTarget",
                "instanceTarget": {
                    "lifecycleEvents": [
                        {
                            "startTime": 1556918592.162,
                            "lifecycleEventName": "ApplicationStop",
                            "status": "Succeeded",
                            "endTime": 1556918592.247,
                            "diagnostics": {
                                "scriptName": "",
                                "errorCode": "Success",
                                "logTail": "",
                                "message": "Succeeded"
                            }
                        },
                        {
                            "startTime": 1556918593.193,
                            "lifecycleEventName": "DownloadBundle",
                            "status": "Succeeded",
                            "endTime": 1556918593.981,
                            "diagnostics": {
                                "scriptName": "",
                                "errorCode": "Success",
                                "logTail": "",
                                "message": "Succeeded"
                            }
                        },
                        {
                            "startTime": 1556918594.805,
                            "lifecycleEventName": "BeforeInstall",
                            "status": "Succeeded",
                            "endTime": 1556918681.807,
                            "diagnostics": {
                                "scriptName": "",
                                "errorCode": "Success",
                                "logTail": "",
                                "message": "Succeeded"
                            }
                        }
                    ],
                    "targetArn": "arn:aws:ec2:us-west-2:123456789012:instance/i-01a2b3c4d5e6f1111",
                    "deploymentId": "d-1A2B3C4D5",
                    "lastUpdatedAt": 1556918687.504,
                    "targetId": "i-01a2b3c4d5e6f1111",
                    "status": "Succeeded"
                }
            }
        ]
    }

For more information, see `BatchGetDeploymentTargets <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_BatchGetDeploymentTargets.html>`_ in the *AWS CodeDeploy API Reference*.
