**To create a report group in AWS CodeBuild.**

The following ``create-report-group`` example creates a new report group. ::

    aws codebuild create-report-group \
        --cli-input-json file://create-report-group-source.json

Contents of create-report-group-source.json::

    {
        "name": "cli-created-report-group",
        "type": "TEST",
        "exportConfig": {
            "exportConfigType": "S3",
            "s3Destination": {
                "bucket": "amzn-s3-demo-bucket",
                "path": "",
                "packaging": "ZIP",
                "encryptionDisabled": true
            }
        }
    }

Output::

    {
        "reportGroup": {
            "arn": "arn:aws:codebuild:<region-ID>:<user-ID>:report-group/cli-created-report-group",
            "name": "cli-created-report-group",
            "type": "TEST",
            "exportConfig": {
                "exportConfigType": "S3",
                "s3Destination": {
                    "bucket": "amzn-s3-demo-bucket",
                    "path": "",
                    "packaging": "ZIP",
                    "encryptionDisabled": true
                }
            },
            "created": 1602020026.775,
            "lastModified": 1602020026.775
        }
    }

For more information, see `Working with report groups <https://docs.aws.amazon.com/codebuild/latest/userguide/test-report-group.html>`__ in the *AWS CodeBuild User Guide*.
