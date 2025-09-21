**To get extension association details**

The following ``get-extension-association`` example displays information about an extension association. ::

    aws appconfig get-extension-association \
        --region us-west-2 \
        --extension-association-id a1b2c3d4

Output::

    {
        "Id": "a1b2c3d4",
        "ExtensionArn": "arn:aws:appconfig:us-west-2:123456789012:extension/S3-backup-extension/1",
        "ResourceArn": "arn:aws:appconfig:us-west-2:123456789012:application/Finance",
        "Parameters": {
            "S3bucket": "FinanceConfigurationBackup"
        },
        "ExtensionVersionNumber": 1
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
