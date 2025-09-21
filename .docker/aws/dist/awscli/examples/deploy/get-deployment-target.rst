**To return information about a deployment target**

The following ``get-deployment-target`` example returns information about a deployment target that is associated with the specified deployment. ::

    aws deploy get-deployment-target \
        --deployment-id "d-A1B2C3111" \
        --target-id "i-a1b2c3d4e5f611111"

Output::

    {
        "deploymentTarget": {
            "deploymentTargetType": "InstanceTarget",
            "instanceTarget": {
                "lastUpdatedAt": 1556918687.504,
                "targetId": "i-a1b2c3d4e5f611111",
                "targetArn": "arn:aws:ec2:us-west-2:123456789012:instance/i-a1b2c3d4e5f611111",
                "status": "Succeeded",
                "lifecycleEvents": [
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "ApplicationStop",
                        "startTime": 1556918592.162,
                        "endTime": 1556918592.247
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "DownloadBundle",
                        "startTime": 1556918593.193,
                        "endTime": 1556918593.981
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "BeforeInstall",
                        "startTime": 1556918594.805,
                        "endTime": 1556918681.807
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "Install",
                        "startTime": 1556918682.696,
                        "endTime": 1556918683.005
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "AfterInstall",
                        "startTime": 1556918684.135,
                        "endTime": 1556918684.216
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "ApplicationStart",
                        "startTime": 1556918685.211,
                        "endTime": 1556918685.295
                    },
                    {
                        "status": "Succeeded",
                        "diagnostics": {
                            "errorCode": "Success",
                            "message": "Succeeded",
                            "logTail": "",
                            "scriptName": ""
                        },
                        "lifecycleEventName": "ValidateService",
                        "startTime": 1556918686.65,
                        "endTime": 1556918686.747
                    }
                ],
                "deploymentId": "d-A1B2C3111"
            }
        }
    }

For more information, see `GetDeploymentTarget <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_GetDeploymentTarget.html>`_ in the *AWS CodeDeploy API Reference*.
