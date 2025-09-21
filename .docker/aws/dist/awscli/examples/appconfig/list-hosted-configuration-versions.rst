**To list the available hosted configuration versions**

The following ``list-hosted-configuration-versions`` example lists the configurations versions hosted in the AWS AppConfig hosted configuration store for the specified application and configuration profile. ::

    aws appconfig list-hosted-configuration-versions \
        --application-id 339ohji \
        --configuration-profile-id ur8hx2f

Output::

    {
        "Items": [
            {
                "ApplicationId": "339ohji",
                "ConfigurationProfileId": "ur8hx2f",
                "VersionNumber": 1,
                "ContentType": "application/json"
            }
        ]
    }

For more information, see `About the AWS AppConfig hosted configuration store <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html#appconfig-creating-configuration-and-profile-about-hosted-store>`__ in the *AWS AppConfig User Guide*.