**To retry a failed build in AWS CodeBuild.**

The following ``retry-build`` example restarts the specified build. ::

    aws codebuild retry-build \
        --id <project-name>:<build-ID>

Output::

    {
        "build": {
            "id": "<project-name>:<build-ID>",
            "arn": "arn:aws:codebuild:<region-ID>:<account-ID>:build/<project-name>:<build-ID>",
            "buildNumber": 9,
            "startTime": "2020-10-21T17:51:38.161000+00:00",
            "currentPhase": "QUEUED",
            "buildStatus": "IN_PROGRESS",
            "projectName": "<project-name>",
            "phases": [
                {
                    "phaseType": "SUBMITTED",
                    "phaseStatus": "SUCCEEDED",
                    "startTime": "2020-10-21T17:51:38.161000+00:00",
                    "endTime": "2020-10-21T17:51:38.210000+00:00",
                    "durationInSeconds": 0
                },
                {
                    "phaseType": "QUEUED",
                    "startTime": "2020-10-21T17:51:38.210000+00:00"
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
            "serviceRole": "arn:aws:iam::<account-ID>:role/service-role/<service-role-name>",
            "logs": {
                "deepLink": "https://console.aws.amazon.com/cloudwatch/home?region=<region-ID>#logEvent:group=null;stream=null",
                "cloudWatchLogsArn": "arn:aws:logs:<region-ID>:<account-ID>:log-group:null:log-stream:null",
                "cloudWatchLogs": {
                    "status": "ENABLED"
                },
                "s3Logs": {
                    "status": "DISABLED",
                    "encryptionDisabled": false
                }
            },
            "timeoutInMinutes": 60,
            "queuedTimeoutInMinutes": 480,
            "buildComplete": false,
            "initiator": "<username>",
            "encryptionKey": "arn:aws:kms:<region-ID>:<account-ID>:alias/aws/s3"
        }
    }

For more information, see `Batch builds in AWS CodeBuild <https://docs.aws.amazon.com/codebuild/latest/userguide/batch-build.html>`__ in the *AWS CodeBuild User Guide*.

