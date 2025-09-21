**To retrieve configuration profile details**

The following ``get-configuration-profile`` example returns the details of the specified configuration profile. ::

    aws appconfig get-configuration-profile \
        --application-id 339ohji \
        --configuration-profile-id ur8hx2f

Output::

    {
        "ApplicationId": "339ohji",
        "Id": "ur8hx2f",
        "Name": "Example-Configuration-Profile",
        "LocationUri": "ssm-parameter://Example-Parameter",
        "RetrievalRoleArn": "arn:aws:iam::111122223333:role/Example-App-Config-Role"
    }

For more information, see `Step 3: Creating a configuration and a configuration profile <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.