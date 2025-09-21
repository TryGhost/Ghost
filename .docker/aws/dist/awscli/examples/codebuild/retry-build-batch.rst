**To retry a failed batch build in AWS CodeBuild.**

The following ``retry-build-batch`` example restarts the specified batch build. ::

    aws codebuild retry-build-batch \
        --id <project-name>:<batch-ID>

Output::

    {
        "buildBatch": {
            "id": "<project-name>:<batch-ID>",
            "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build-batch/<project-name>:<batch-ID>",
            "startTime": "2020-10-21T17:26:23.099000+00:00",
            "currentPhase": "SUBMITTED",
            "buildBatchStatus": "IN_PROGRESS",
            "resolvedSourceVersion": "3a9e11cb419e8fff14b03883dc4e64f6155aaa7e",
            "projectName": "<project-name>",
            "phases": [
                {
                    "phaseType": "SUBMITTED",
                    "phaseStatus": "SUCCEEDED",
                    "startTime": "2020-10-21T17:26:23.099000+00:00",
                    "endTime": "2020-10-21T17:26:23.457000+00:00",
                    "durationInSeconds": 0
                },
                {
                    "phaseType": "DOWNLOAD_BATCHSPEC",
                    "phaseStatus": "SUCCEEDED",
                    "startTime": "2020-10-21T17:26:23.457000+00:00",
                    "endTime": "2020-10-21T17:26:54.902000+00:00",
                    "durationInSeconds": 31
                },
                {
                    "phaseType": "IN_PROGRESS",
                    "phaseStatus": "CLIENT_ERROR",
                    "startTime": "2020-10-21T17:26:54.902000+00:00",
                    "endTime": "2020-10-21T17:28:16.060000+00:00",
                    "durationInSeconds": 81
                },
                {
                    "phaseType": "FAILED",
                    "phaseStatus": "RETRY",
                    "startTime": "2020-10-21T17:28:16.060000+00:00",
                    "endTime": "2020-10-21T17:29:39.709000+00:00",
                    "durationInSeconds": 83
                },
                {
                    "phaseType": "SUBMITTED",
                    "startTime": "2020-10-21T17:29:39.709000+00:00"
                }
            ],
            "source": {
                "type": "GITHUB",
                "location": "https://github.com/strohm-a/<project-name>-graph.git",
                "gitCloneDepth": 1,
                "gitSubmodulesConfig": {
                    "fetchSubmodules": false
                },
                "reportBuildStatus": false,
                "insecureSsl": false
            },
            "secondarySources": [],
            "secondarySourceVersions": [],
            "artifacts": {
                "location": ""
            },
            "secondaryArtifacts": [],
            "cache": {
                "type": "NO_CACHE"
            },
            "environment": {
                "type": "LINUX_CONTAINER",
                "image": "aws/codebuild/amazonlinux2-x86_64-standard:3.0",
                "computeType": "BUILD_GENERAL1_SMALL",
                "environmentVariables": [],
                "privilegedMode": false,
                "imagePullCredentialsType": "CODEBUILD"
            },
            "logConfig": {
                "cloudWatchLogs": {
                    "status": "ENABLED"
                },
                "s3Logs": {
                    "status": "DISABLED",
                    "encryptionDisabled": false
                }
            },
            "buildTimeoutInMinutes": 60,
            "queuedTimeoutInMinutes": 480,
            "complete": false,
            "initiator": "<username>",
            "encryptionKey": "arn:aws:kms:<region-ID>:<account-ID>:alias/aws/s3",
            "buildBatchNumber": 4,
            "buildBatchConfig": {
                "serviceRole": "arn:aws:iam::<account-ID>:role/service-role/<project-name>",
                "restrictions": {
                    "maximumBuildsAllowed": 100
                },
                "timeoutInMins": 480
            },
            "buildGroups": [
                {
                    "identifier": "DOWNLOAD_SOURCE",
                    "ignoreFailure": false,
                    "currentBuildSummary": {
                        "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
                        "requestedOn": "2020-10-21T17:26:23.889000+00:00",
                        "buildStatus": "SUCCEEDED",
                        "primaryArtifact": {
                            "type": "no_artifacts",
                            "identifier": "DOWNLOAD_SOURCE"
                        },
                        "secondaryArtifacts": []
                    }
                },
                {
                    "identifier": "linux_small",
                    "dependsOn": [],
                    "ignoreFailure": false,
                    "currentBuildSummary": {
                        "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
                        "requestedOn": "2020-10-21T17:26:55.115000+00:00",
                        "buildStatus": "FAILED",
                        "primaryArtifact": {
                            "type": "no_artifacts",
                            "identifier": "linux_small"
                        },
                        "secondaryArtifacts": []
                    }
                },
                {
                    "identifier": "linux_medium",
                    "dependsOn": [
                        "linux_small"
                    ],
                    "ignoreFailure": false,
                    "currentBuildSummary": {
                        "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
                        "requestedOn": "2020-10-21T17:26:54.594000+00:00",
                        "buildStatus": "STOPPED"
                    }
                },
                {
                    "identifier": "linux_large",
                    "dependsOn": [
                        "linux_medium"
                    ],
                    "ignoreFailure": false,
                    "currentBuildSummary": {
                        "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
                        "requestedOn": "2020-10-21T17:26:54.701000+00:00",
                        "buildStatus": "STOPPED"
                    }
                }
            ]
        }
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

