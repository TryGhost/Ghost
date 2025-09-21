**To retrieve environment details**

The following ``get-environment`` example returns the details and state of the specified environment. ::

    aws appconfig get-environment \
        --application-id 339ohji \
        --environment-id 54j1r29

Output::

    {
        "ApplicationId": "339ohji",
        "Id": "54j1r29",
        "Name": "Example-Environment",
        "State": "ReadyForDeployment"
    }

For more information, see `Step 2: Creating an environment <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html>`__ in the *AWS AppConfig User Guide*.