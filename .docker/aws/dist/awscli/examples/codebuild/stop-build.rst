**To stop a build of an AWS CodeBuild build project.**

The following ``stop-build`` example stops the specified CodeBuild build. ::

    aws codebuild stop-build --id my-demo-project:12345678-a1b2-c3d4-e5f6-11111EXAMPLE

Output::

    {
        "build": {
            "startTime": 1556906956.318,
            "initiator": "my-aws-account-name",
            "projectName": "my-demo-project",
            "currentPhase": "COMPLETED",
            "cache": {
                "type": "NO_CACHE"
            },
            "source": {
                "insecureSsl": false,
                "location": "codebuild-us-west-2-123456789012-input-bucket/my-source.zip",
                "type": "S3"
            },
            "id": "my-demo-project:1a2b3c4d-5678-90ab-cdef-11111EXAMPLE",
            "endTime": 1556906974.781,
            "phases": [
                {
                    "durationInSeconds": 0,
                    "phaseType": "SUBMITTED",
                    "endTime": 1556906956.935,
                    "phaseStatus": "SUCCEEDED",
                    "startTime": 1556906956.318
                },
                {
                    "durationInSeconds": 1,
                    "phaseType": "QUEUED",
                    "endTime": 1556906958.272,
                    "phaseStatus": "SUCCEEDED",
                    "startTime": 1556906956.935
                },
                {
                    "phaseType": "PROVISIONING",
                    "phaseStatus": "SUCCEEDED",
                    "durationInSeconds": 14,
                    "contexts": [
                        {
                            "message": "",
                            "statusCode": ""
                        }
                    ],
                    "endTime": 1556906972.847,
                    "startTime": 1556906958.272
                },
                {
                    "phaseType": "DOWNLOAD_SOURCE",
                    "phaseStatus": "SUCCEEDED",
                    "durationInSeconds": 0,
                    "contexts": [
                            {
                            "message": "",
                            "statusCode": ""
                        }
                    ],
                    "endTime": 1556906973.552,
                    "startTime": 1556906972.847
                },
                {
                    "phaseType": "INSTALL",
                    "phaseStatus": "SUCCEEDED",
                    "durationInSeconds": 0,
                    "contexts": [
                        {
                            "message": "",
                            "statusCode": ""
                        }
                    ],
                    "endTime": 1556906973.75,
                    "startTime": 1556906973.552
                },
                {
                    "phaseType": "PRE_BUILD",
                    "phaseStatus": "SUCCEEDED",
                    "durationInSeconds": 0,
                    "contexts": [
                        {
                            "message": "",
                            "statusCode": ""
                        }
                    ],
                    "endTime": 1556906973.937,
                    "startTime": 1556906973.75
                },
                {
                    "durationInSeconds": 0,
                    "phaseType": "BUILD",
                    "endTime": 1556906974.781,
                    "phaseStatus": "STOPPED",
                    "startTime": 1556906973.937
                },
                {
                    "phaseType": "COMPLETED",
                    "startTime": 1556906974.781
                }
            ],
            "artifacts": {
                "location": "arn:aws:s3:::artifacts-override/my-demo-project",
                "encryptionDisabled": false,
                "overrideArtifactName": true
            },
            "buildComplete": true,
            "buildStatus": "STOPPED",
            "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
            "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
            "queuedTimeoutInMinutes": 5,
            "timeoutInMinutes": 60,
            "environment": {
                "type": "LINUX_CONTAINER",
                "environmentVariables": [],
                "computeType": "BUILD_GENERAL1_MEDIUM",
                "privilegedMode": false,
                "image": "aws/codebuild/standard:1.0",
                "imagePullCredentialsType": "CODEBUILD"
            },
            "logs": {
                "streamName": "1a2b3c4d-5678-90ab-cdef-11111EXAMPLE",
                "deepLink": "https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logEvent:group=/aws/codebuild/my-demo-project;stream=1a2b3c4d-5678-90ab-cdef-11111EXAMPLE",
                "groupName": "/aws/codebuild/my-demo-project"
            },
            "arn": "arn:aws:codebuild:us-west-2:123456789012:build/my-demo-project:1a2b3c4d-5678-90ab-cdef-11111EXAMPLE"
        }
    }

For more information, see `Stop a Build (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/stop-build.html#stop-build-cli>`_ in the *AWS CodeBuild User Guide*.
