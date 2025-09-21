**To change an AWS CodeBuild build project's settings.**

The following ``update-project`` example changes the settings of the specified CodeBuild build project named my-demo-project. ::

    aws codebuild update-project --name "my-demo-project" \
        --description "This project is updated" \
        --source "{\"type\": \"S3\",\"location\": \"codebuild-us-west-2-123456789012-input-bucket/my-source-2.zip\"}" \
        --artifacts {"\"type\": \"S3\",\"location\": \"codebuild-us-west-2-123456789012-output-bucket-2\""} \
        --environment "{\"type\": \"LINUX_CONTAINER\",\"image\": \"aws/codebuild/standard:1.0\",\"computeType\": \"BUILD_GENERAL1_MEDIUM\"}" \
        --service-role "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role"

The output displays the updated settings. ::

    {
        "project": {
            "arn": "arn:aws:codebuild:us-west-2:123456789012:project/my-demo-project",
            "environment": {
                "privilegedMode": false,
                "environmentVariables": [],
                "type": "LINUX_CONTAINER",
                "image": "aws/codebuild/standard:1.0",
                "computeType": "BUILD_GENERAL1_MEDIUM",
                "imagePullCredentialsType": "CODEBUILD"
            },
            "queuedTimeoutInMinutes": 480,
            "description": "This project is updated",
            "artifacts": {
                "packaging": "NONE",
                "name": "my-demo-project",
                "type": "S3",
                "namespaceType": "NONE",
                "encryptionDisabled": false,
                "location": "codebuild-us-west-2-123456789012-output-bucket-2"
            },
            "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
            "badge": {
                "badgeEnabled": false
            },
            "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
            "lastModified": 1556840545.967,
            "tags": [],
            "timeoutInMinutes": 60,
            "created": 1556839783.274,
            "name": "my-demo-project",
            "cache": {
                "type": "NO_CACHE"
            },
            "source": {
                "type": "S3",
                "insecureSsl": false,
                "location": "codebuild-us-west-2-123456789012-input-bucket/my-source-2.zip"
            }
        }
    }

For more information, see `Change a Build Project's Settings (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/change-project.html#change-project-cli>`_ in the *AWS CodeBuild User Guide*
