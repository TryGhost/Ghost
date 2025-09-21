**To start a batch build in AWS CodeBuild.**

The following ``start-build-batch`` example starts a batch build of the specified project. ::

    aws codebuild start-build-batch \
        --project-name <project-name>

Output::

    {
        "buildBatch": {
            "id": "<project-name>:<batch-ID>",
            "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build-batch/<project-name>:<batch-ID>",
            "startTime": "2020-10-21T16:54:24.740000+00:00",
            "currentPhase": "SUBMITTED",
            "buildBatchStatus": "IN_PROGRESS",
            "projectName": "<project-name>",
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
            "complete": false,
            "initiator": "<username>",
            "encryptionKey": "arn:aws:kms:<region-ID>:<account-ID>:alias/aws/s3",
            "buildBatchNumber": 3,
            "buildBatchConfig": {
                "serviceRole": "arn:aws:iam::<account-ID>:role/service-role/<service-role-name>",
                "restrictions": {
                    "maximumBuildsAllowed": 100
                },
                "timeoutInMins": 480
            }
        }
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

