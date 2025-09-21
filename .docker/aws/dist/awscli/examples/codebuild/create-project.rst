**Example 1: To create an AWS CodeBuild build project**

The following ``create-project`` example creates a CodeBuild build project using source files from an S3 bucket ::

    aws codebuild create-project \
        --name "my-demo-project" \
        --source "{\"type\": \"S3\",\"location\": \"codebuild-us-west-2-123456789012-input-bucket/my-source.zip\"}" \
        --artifacts {"\"type\": \"S3\",\"location\": \"codebuild-us-west-2-123456789012-output-bucket\""} \
        --environment "{\"type\": \"LINUX_CONTAINER\",\"image\": \"aws/codebuild/standard:1.0\",\"computeType\": \"BUILD_GENERAL1_SMALL\"}" \
        --service-role "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role"

Output::

    {
        "project": {
            "arn": "arn:aws:codebuild:us-west-2:123456789012:project/my-demo-project",
            "name": "my-cli-demo-project",
            "encryptionKey": "arn:aws:kms:us-west-2:123456789012:alias/aws/s3",
            "serviceRole": "arn:aws:iam::123456789012:role/service-role/my-codebuild-service-role",
            "lastModified": 1556839783.274,
            "badge": {
                "badgeEnabled": false
            },
            "queuedTimeoutInMinutes": 480,
            "environment": {
                "image": "aws/codebuild/standard:1.0",
                "computeType": "BUILD_GENERAL1_SMALL",
                "type": "LINUX_CONTAINER",
                "imagePullCredentialsType": "CODEBUILD",
                "privilegedMode": false,
                "environmentVariables": []
            },
            "artifacts": {
                "location": "codebuild-us-west-2-123456789012-output-bucket",
                "name": "my-cli-demo-project",
                "namespaceType": "NONE",
                "type": "S3",
                "packaging": "NONE",
                "encryptionDisabled": false
            },
            "source": {
                "type": "S3",
                "location": "codebuild-us-west-2-123456789012-input-bucket/my-source.zip",
                "insecureSsl": false
            },
            "timeoutInMinutes": 60,
            "cache": {
                "type": "NO_CACHE"
            },
            "created": 1556839783.274
        }
    }

**Example 2: To create an AWS CodeBuild build project using a JSON input file for the parameters**

The following ``create-project`` example creates a CodeBuild build project by passing all of the required parameters in a JSON input file. Create the input file template by running the command with only the ``--generate-cli-skeleton parameter``. ::

    aws codebuild create-project --cli-input-json file://create-project.json

The input JSON file ``create-project.json`` contains the following content::

    {
        "name": "codebuild-demo-project",
        "source": {
            "type": "S3",
            "location": "codebuild-region-ID-account-ID-input-bucket/MessageUtil.zip"
        },
        "artifacts": {
            "type": "S3",
            "location": "codebuild-region-ID-account-ID-output-bucket"
        },
        "environment": {
            "type": "LINUX_CONTAINER",
            "image": "aws/codebuild/standard:1.0",
            "computeType": "BUILD_GENERAL1_SMALL"
        },
        "serviceRole": "serviceIAMRole"
    }

Output::

    {
        "project": {
            "name": "codebuild-demo-project",
            "serviceRole": "serviceIAMRole",
            "tags": [],
            "artifacts": {
                "packaging": "NONE",
                "type": "S3",
                "location": "codebuild-region-ID-account-ID-output-bucket",
                "name": "message-util.zip"
            },
            "lastModified": 1472661575.244,
            "timeoutInMinutes": 60,
            "created": 1472661575.244,
            "environment": {
                "computeType": "BUILD_GENERAL1_SMALL",
                "image": "aws/codebuild/standard:1.0",
                "type": "LINUX_CONTAINER",
                "environmentVariables": []
            },
            "source": {
                "type": "S3",
                "location": "codebuild-region-ID-account-ID-input-bucket/MessageUtil.zip"
            },
            "encryptionKey": "arn:aws:kms:region-ID:account-ID:alias/aws/s3",
            "arn": "arn:aws:codebuild:region-ID:account-ID:project/codebuild-demo-project"
        }
    }

For more information, see `Create a Build Project (AWS CLI) <https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html#create-project-cli>`_ in the *AWS CodeBuild User Guide*.

