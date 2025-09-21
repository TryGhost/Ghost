**To get extension details**

The following ``get-extension`` example displays information about an extension. ::

    aws appconfig get-extension \
        --region us-west-2 \
        --extension-identifier S3-backup-extension

Output::

    {
        "Id": "1A2B3C4D",
        "Name": "S3-backup-extension",
        "VersionNumber": 1,
        "Arn": "arn:aws:appconfig:us-west-2:123456789012:extension/S3-backup-extension/1",
        "Actions": {
            "PRE_CREATE_HOSTED_CONFIGURATION_VERSION": [
                {
                    "Name": "S3backup",
                    "Uri": "arn:aws:lambda:us-west-2:123456789012:function:S3backupfunction",
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
