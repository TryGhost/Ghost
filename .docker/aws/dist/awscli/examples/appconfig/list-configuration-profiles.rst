**To list the available configuration profiles**

The following ``list-configuration-profiles`` example lists the available configuration profiles for the specified application. ::

    aws appconfig list-configuration-profiles \
        --application-id 339ohji

Output::

    {
        "Items": [
            {
                "ApplicationId": "339ohji",
                "Id": "ur8hx2f",
                "Name": "Example-Configuration-Profile",
                "LocationUri": "ssm-parameter://Example-Parameter"
            }
        ]
    }

For more information, see `Step 3: Creating a configuration and a configuration profile  <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.