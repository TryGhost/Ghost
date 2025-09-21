**To create an extension association**

The following ``create-extension-association`` example creates a new extension association in AWS AppConfig. ::

    aws appconfig create-extension-association \
        --region us-west-2 \
        --extension-identifier S3-backup-extension \
        --resource-identifier "arn:aws:appconfig:us-west-2:123456789012:application/Finance" \
        --parameters S3bucket=FinanceConfigurationBackup

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
