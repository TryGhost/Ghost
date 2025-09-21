**To stop an in-progress batch build in AWS CodeBuild.**

The following ``stop-build-batch`` example stops the specified batch build. ::

    aws codebuild stop-build-batch \
        --id <project-name>:<batch-ID>

Output::

    {
        "buildBatch": {
            "id": "<project-name>:<batch-ID>",
            "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build-batch/<project-name>:<batch-ID>",
            "startTime": "2020-10-21T16:54:24.740000+00:00",
            "endTime": "2020-10-21T16:56:05.152000+00:00",
            "currentPhase": "STOPPED",
            "buildBatchStatus": "STOPPED",
            "resolvedSourceVersion": "aef7744ed069c51098e15c360f4102cd2cd1ad64",
            "projectName": "<project-name>",
            "phases": [
                {
                    "phaseType": "SUBMITTED",
                    "phaseStatus": "SUCCEEDED",
                    "startTime": "2020-10-21T16:54:24.740000+00:00",
                    "endTime": "2020-10-21T16:54:25.039000+00:00",
                    "durationInSeconds": 0
                },
                {
                    "phaseType": "DOWNLOAD_BATCHSPEC",
                    "phaseStatus": "SUCCEEDED",
                    "startTime": "2020-10-21T16:54:25.039000+00:00",
                    "endTime": "2020-10-21T16:54:56.583000+00:00",
                    "durationInSeconds": 31
                },
                {
                    "phaseType": "IN_PROGRESS",
                    "phaseStatus": "STOPPED",
                    "startTime": "2020-10-21T16:54:56.583000+00:00",
                    "endTime": "2020-10-21T16:56:05.152000+00:00",
                    "durationInSeconds": 68
                },
                {
                    "phaseType": "STOPPED",
                    "startTime": "2020-10-21T16:56:05.152000+00:00"
                }
            ],
            "source": {
                "type": "GITHUB",
                "location": "<GitHub-repo-URL>",
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
            "complete": true,
            "initiator": "Strohm",
            "encryptionKey": "arn:aws:kms:<region-ID>:<account-ID>:alias/aws/s3",
            "buildBatchNumber": 3,
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
                        "requestedOn": "2020-10-21T16:54:25.468000+00:00",
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
                        "requestedOn": "2020-10-21T16:54:56.833000+00:00",
                        "buildStatus": "IN_PROGRESS"
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
                        "requestedOn": "2020-10-21T16:54:56.211000+00:00",
                        "buildStatus": "PENDING"
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
                        "requestedOn": "2020-10-21T16:54:56.330000+00:00",
                        "buildStatus": "PENDING"
                    }
                }
            ]
        }
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

