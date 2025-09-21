**To update an AWS AppConfig extension**

The following ``update-extension`` example adds an additional parameter Key to an extension in AWS AppConfig. ::

    aws appconfig update-extension \
        --region us-west-2 \
        --extension-identifier S3-backup-extension \
        --parameters S3bucket={Required=true},CampaignID={Required=false}

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
                    "Uri": "arn:aws:lambda:us-west-2:123456789012:function:S3backupfunction",
                    "RoleArn": "arn:aws:iam::123456789012:role/appconfigextensionrole"
                }
            ]
        },
        "Parameters": {
            "CampaignID": {
                "Required": false
            },
            "S3bucket": {
                "Required": true
            }
        }
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
