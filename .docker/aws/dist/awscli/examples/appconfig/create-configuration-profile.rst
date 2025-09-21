**To create a configuration profile**

The following ``create-configuration-profile`` example creates a configuration profile using a configuration stored in Parameter Store, a capability of Systems Manager. ::

    aws appconfig create-configuration-profile \
        --application-id "339ohji" \
        --name "Example-Configuration-Profile" \
        --location-uri "ssm-parameter://Example-Parameter" \
        --retrieval-role-arn "arn:aws:iam::111122223333:role/Example-App-Config-Role"

Output::

    {
        "ApplicationId": "339ohji",
        "Description": null,
        "Id": "ur8hx2f",
        "LocationUri": "ssm-parameter://Example-Parameter",
        "Name": "Example-Configuration-Profile",
        "RetrievalRoleArn": "arn:aws:iam::111122223333:role/Example-App-Config-Role",
        "Type": null,
        "Validators": null
    }

For more information, see `Step 3: Creating a configuration and a configuration profile  <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html>`__ in the *AWS AppConfig User Guide*.