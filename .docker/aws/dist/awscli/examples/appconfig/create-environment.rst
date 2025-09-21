**To create an environment**

The following ``create-environment`` example creates an AWS AppConfig environment named Example-Environment using the application you created using create-application. ::

    aws appconfig create-environment \
        --application-id "339ohji" \
        --name "Example-Environment"

Output::

    {
        "ApplicationId": "339ohji",
        "Description": null,
        "Id": "54j1r29",
        "Monitors": null,
        "Name": "Example-Environment",
        "State": "ReadyForDeployment"
    }

For more information, see `Step 2: Creating an environment <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html>`__ in the *AWS AppConfig User Guide*.