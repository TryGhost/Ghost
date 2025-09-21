**To view details of builds in AWS CodeBuild.**

The following ``batch-get-builds`` example gets information about builds in CodeBuild with the specified IDs. ::

    aws codebuild batch-get-builds --ids codebuild-demo-project:e9c4f4df-3f43-41d2-ab3a-60fe2EXAMPLE codebuild-demo-project:815e755f-bade-4a7e-80f0-efe51EXAMPLE

Output::

    {
        "buildsNotFound": [],
        "builds": [
            {
                "artifacts": {
                    "md5sum": "0e95edf915048a0c22efe6d139fff837",
                    "location": "arn:aws:s3:::codepipeline-us-west-2-820783811474/CodeBuild-Python-Pip/BuildArtif/6DJsqQa",
                    "encryptionDisabled": false,
                    "sha256sum": "cfa0df33a090966a737f64ae4fe498969fdc842a0c9aec540bf93c37ac0d05a2"
                },
                "logs": {
                    "cloudWatchLogs": {
                        "status": "ENABLED"
                    },
                    "s3Logs": {
                        "status": "DISABLED"
                    },
                    "streamName": "46472baf-8f6b-43c2-9255-b3b963af2732",
                    "groupName": "/aws/codebuild/codebuild-demo-project",
                    "deepLink": "https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logEvent:group=/aws/codebuild/codebuild-demo-project;stream=46472baf-8f6b-43c2-9255-b3b963af2732"
                },
                "timeoutInMinutes": 60,
                "environment": {
                    "privilegedMode": false,
                    "computeType": "BUILD_GENERAL1_MEDIUM",
                    "image": "aws/codebuild/windows-base:1.0",
                    "environmentVariables": [],
                    "type": "WINDOWS_CONTAINER"
                },
                "projectName": "codebuild-demo-project",
                "buildComplete": true,
                "source": {
                    "gitCloneDepth": 1,
                    "insecureSsl": false,
                    "type": "CODEPIPELINE"
                },
                "buildStatus": "SUCCEEDED",
                "secondaryArtifacts": [],
                "phases": [
                    {
                        "durationInSeconds": 0,
                        "startTime": 1548717462.122,
                        "phaseType": "SUBMITTED",
                        "endTime": 1548717462.484,
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "startTime": 1548717462.484,
                        "phaseType": "QUEUED",
                        "endTime": 1548717462.775,
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 34,
                        "endTime": 1548717496.909,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717462.775,
                        "phaseType": "PROVISIONING",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 15,
                        "endTime": 1548717512.555,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717496.909,
                        "phaseType": "DOWNLOAD_SOURCE",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "endTime": 1548717512.734,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717512.555,
                        "phaseType": "INSTALL",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "endTime": 1548717512.924,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717512.734,
                        "phaseType": "PRE_BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 9,
                        "endTime": 1548717522.254,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717512.924,
                        "phaseType": "BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 3,
                        "endTime": 1548717525.498,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717522.254,
                        "phaseType": "POST_BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 9,
                        "endTime": 1548717534.646,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717525.498,
                        "phaseType": "UPLOAD_ARTIFACTS",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 2,
                        "endTime": 1548717536.846,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548717534.646,
                        "phaseType": "FINALIZING",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "startTime": 1548717536.846,
                        "phaseType": "COMPLETED"
                    }
                ],
                "startTime": 1548717462.122,
                "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
                "initiator": "codepipeline/CodeBuild-Pipeline",
                "secondarySources": [],
                "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
                "currentPhase": "COMPLETED",
                "id": "codebuild-demo-project:e9c4f4df-3f43-41d2-ab3a-60fe2EXAMPLE",
                "cache": {
                    "type": "NO_CACHE"
                },
                "sourceVersion": "arn:aws:s3:::codepipeline-us-west-2-820783811474/CodeBuild-Python-Pip/SourceArti/1TspnN3.zip",
                "endTime": 1548717536.846,
                "arn": "arn:aws:codebuild:us-west-2:123456789012:build/codebuild-demo-project:e9c4f4df-3f43-41d2-ab3a-60fe2EXAMPLE",
                "queuedTimeoutInMinutes": 480,
                "resolvedSourceVersion": "f2194c1757bbdcb0f8f229254a4b3c8b27d43e0b"
            },
            {
                "artifacts": {
                    "md5sum": "",
                    "overrideArtifactName": false,
                    "location": "arn:aws:s3:::my-artifacts/codebuild-demo-project",
                    "encryptionDisabled": false,
                    "sha256sum": ""
                },
                "logs": {
                    "cloudWatchLogs": {
                        "status": "ENABLED"
                    },
                    "s3Logs": {
                        "status": "DISABLED"
                    },
                    "streamName": "4dea3ca4-20ec-4898-b22a-a9eb9292775d",
                    "groupName": "/aws/codebuild/codebuild-demo-project",
                    "deepLink": "https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logEvent:group=/aws/codebuild/codebuild-demo-project;stream=4dea3ca4-20ec-4898-b22a-a9eb9292775d"
                },
                "timeoutInMinutes": 60,
                "environment": {
                    "privilegedMode": false,
                    "computeType": "BUILD_GENERAL1_MEDIUM",
                    "image": "aws/codebuild/windows-base:1.0",
                    "environmentVariables": [],
                    "type": "WINDOWS_CONTAINER"
                },
                "projectName": "codebuild-demo-project",
                "buildComplete": true,
                "source": {
                    "gitCloneDepth": 1,
                    "location": "https://github.com/my-repo/codebuild-demo-project.git",
                    "insecureSsl": false,
                    "reportBuildStatus": false,
                    "type": "GITHUB"
                },
                "buildStatus": "SUCCEEDED",
                "secondaryArtifacts": [],
                "phases": [
                    {
                        "durationInSeconds": 0,
                        "startTime": 1548716241.89,
                        "phaseType": "SUBMITTED",
                        "endTime": 1548716242.241,
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "startTime": 1548716242.241,
                        "phaseType": "QUEUED",
                        "endTime": 1548716242.536,
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 33,
                        "endTime": 1548716276.171,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716242.536,
                        "phaseType": "PROVISIONING",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 15,
                        "endTime": 1548716291.809,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716276.171,
                        "phaseType": "DOWNLOAD_SOURCE",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "endTime": 1548716291.993,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716291.809,
                        "phaseType": "INSTALL",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 0,
                        "endTime": 1548716292.191,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716291.993,
                        "phaseType": "PRE_BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 9,
                        "endTime": 1548716301.622,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716292.191,
                        "phaseType": "BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 3,
                        "endTime": 1548716304.783,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716301.622,
                        "phaseType": "POST_BUILD",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 8,
                        "endTime": 1548716313.775,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716304.783,
                        "phaseType": "UPLOAD_ARTIFACTS",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "durationInSeconds": 2,
                        "endTime": 1548716315.935,
                        "contexts": [
                            {
                                "statusCode": "",
                                "message": ""
                            }
                        ],
                        "startTime": 1548716313.775,
                        "phaseType": "FINALIZING",
                        "phaseStatus": "SUCCEEDED"
                    },
                    {
                        "startTime": 1548716315.935,
                        "phaseType": "COMPLETED"
                    }
                ],
                "startTime": 1548716241.89,
                "secondarySourceVersions": [],
                "initiator": "my-codebuild-project",
                "arn": "arn:aws:codebuild:us-west-2:123456789012:build/codebuild-demo-project:815e755f-bade-4a7e-80f0-efe51EXAMPLE",
                "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
                "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
                "currentPhase": "COMPLETED",
                "id": "codebuild-demo-project:815e755f-bade-4a7e-80f0-efe51EXAMPLE",
                "cache": {
                    "type": "NO_CACHE"
                },
                "endTime": 1548716315.935,
                "secondarySources": [],
                "queuedTimeoutInMinutes": 480,
                "resolvedSourceVersion": "f2194c1757bbdcb0f8f229254a4b3c8b27d43e0b"
            }
        ]
    }

For more information, see `View Build Details (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/view-build-details.html#view-build-details-cli>`_ in the *AWS CodeBuild User Guide*.

