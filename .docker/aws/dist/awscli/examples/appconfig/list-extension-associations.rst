**To list all AWS AppConfig extension associations in your AWS account for an AWS Region**

The following ``list-extension-associations`` example lists all AWS AppConfig extension associations for the current AWS account in a specific AWS Region. ::

    aws appconfig list-extension-associations \
        --region us-west-2 

Output::

    {
        "Items": [
            {
                "Id": "a1b2c3d4",
                "ExtensionArn": "arn:aws:appconfig:us-west-2:123456789012:extension/S3-backup-extension/1",
                "ResourceArn": "arn:aws:appconfig:us-west-2:123456789012:application/Finance"
            }
        ]
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
