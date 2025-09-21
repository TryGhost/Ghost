**To start running a build of an AWS CodeBuild build project.**

The following ``start-build`` example starts a build for the specified CodeBuild project. The build overrides both the project's setting for the number of minutes the build is allowed to be queued before it times out and the project's artifact settings. ::

    aws codebuild start-build \
        --project-name "my-demo-project" \
        --queued-timeout-in-minutes-override 5 \
        --artifacts-override {"\"type\": \"S3\",\"location\": \"arn:aws:s3:::artifacts-override\",\"overrideArtifactName\":true"}

Output::

    {
        "build": {
            "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
            "buildStatus": "IN_PROGRESS",
            "buildComplete": false,
            "projectName": "my-demo-project",
            "timeoutInMinutes": 60,
            "source": {
                "insecureSsl": false,
                "type": "S3",
                "location": "codebuild-us-west-2-123456789012-input-bucket/my-source.zip"
            },
            "queuedTimeoutInMinutes": 5,
            "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
            "currentPhase": "QUEUED",
            "startTime": 1556905683.568,
            "environment": {
                "computeType": "BUILD_GENERAL1_MEDIUM",
                "environmentVariables": [],
                "type": "LINUX_CONTAINER",
                "privilegedMode": false,
                "image": "aws/codebuild/standard:1.0",
                "imagePullCredentialsType": "CODEBUILD"
            },
            "phases": [
                {
                    "phaseStatus": "SUCCEEDED",
                    "startTime": 1556905683.568,
                    "phaseType": "SUBMITTED",
                    "durationInSeconds": 0,
                    "endTime": 1556905684.524
                },
                {
                    "startTime": 1556905684.524,
                    "phaseType": "QUEUED"
                }
            ],
            "logs": {
                "deepLink": "https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logEvent:group=null;stream=null"
            },
            "artifacts": {
                "encryptionDisabled": false,
                "location": "arn:aws:s3:::artifacts-override/my-demo-project",
                "overrideArtifactName": true
            },
            "cache": {
                "type": "NO_CACHE"
            },
            "id": "my-demo-project::12345678-a1b2-c3d4-e5f6-11111EXAMPLE",
            "initiator": "my-aws-account-name",
            "arn": "arn:aws:codebuild:us-west-2:123456789012:build/my-demo-project::12345678-a1b2-c3d4-e5f6-11111EXAMPLE"
        }
    }

For more information, see `Run a Build (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/run-build.html#run-build-cli>`_ in the *AWS CodeBuild User Guide*.
