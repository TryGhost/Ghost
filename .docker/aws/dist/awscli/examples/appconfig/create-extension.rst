**To create an extension**

The following ``create-extension`` example creates a new extension in AWS AppConfig. ::

    aws appconfig create-extension \
        --region us-west-2 \
        --name S3-backup-extension \
        --actions PRE_CREATE_HOSTED_CONFIGURATION_VERSION=[{Name=S3backup,Uri=arn:aws:lambda:us-west-2:123456789012:function:s3backupfunction,RoleArn=arn:aws:iam::123456789012:role/appconfigextensionrole}] \
        --parameters S3bucket={Required=true}

Output::

    {
        "Id": "1A2B3C4D",
        "Name": "S3-backup-extension",
        "VersionNumber": 1,
        "Arn": "arn:aws:appconfig:us-west-2:123456789012:extension/1A2B3C4D/1",
        "Actions": {
            "PRE_CREATE_HOSTED_CONFIGURATION_VERSION": [
                {
                    "Name": "S3backup",
                    "Uri": "arn:aws:lambda:us-west-2:123456789012:function:s3backupfunction",
                    "RoleArn": "arn:aws:iam::123456789012:role/appconfigextensionrole"
                }
            ]
        },
        "Parameters": {
            "S3bucket": {
                "Required": true
            }
        }
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
