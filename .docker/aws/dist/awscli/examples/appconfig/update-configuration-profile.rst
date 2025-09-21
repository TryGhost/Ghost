**To update a configuration profile**

The following ``update-configuration-profile`` example updates the description of the specified configuration profile. ::

    aws appconfig update-configuration-profile \
        --application-id 339ohji \
        --configuration-profile-id ur8hx2f \
        --description "Configuration profile used for examples."

Output::

    {
        "ApplicationId": "339ohji",
        "Id": "ur8hx2f",
        "Name": "Example-Configuration-Profile",
        "Description": "Configuration profile used for examples.",
        "LocationUri": "ssm-parameter://Example-Parameter",
        "RetrievalRoleArn": "arn:aws:iam::111122223333:role/Example-App-Config-Role"
    }

For more information, see `Step 3: Creating a configuration and a configuration profile  <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.