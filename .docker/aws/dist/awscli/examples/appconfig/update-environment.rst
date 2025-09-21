**To update an environment**

The following ``update-environment`` example updates an environment's description. ::

    aws appconfig update-environment \
        --application-id 339ohji \
        --environment-id 54j1r29 \
        --description "An environment for examples."

Output::

    {
        "ApplicationId": "339ohji",
        "Id": "54j1r29",
        "Name": "Example-Environment",
        "Description": "An environment for examples.",
        "State": "RolledBack"
    }

For more information, see `Step 2: Creating an environment <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html>`__ in the *AWS AppConfig User Guide*.