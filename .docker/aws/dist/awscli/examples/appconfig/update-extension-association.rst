**To update an AWS AppConfig extension association**

The following ``update-extension-association`` example adds a new parameter value to an extension association in AWS AppConfig. ::

    aws appconfig update-extension-association \
        --region us-west-2 \
        --extension-association-id a1b2c3d4 \
        --parameters S3bucket=FinanceMobileApp

Output::

    {
        "Id": "a1b2c3d4",
        "ExtensionArn": "arn:aws:appconfig:us-west-2:123456789012:extension/S3-backup-extension/1",
        "ResourceArn": "arn:aws:appconfig:us-west-2:123456789012:application/Finance",
        "Parameters": {
            "S3bucket": "FinanceMobileApp"
        },
        "ExtensionVersionNumber": 1
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
