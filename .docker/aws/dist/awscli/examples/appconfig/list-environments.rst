**To list the available environments**

The following ``list-environments`` example lists the available environments in your AWS account for the specified application. ::

    aws appconfig list-environments \
        --application-id 339ohji

Output::

    {
        "Items": [
            {
                "ApplicationId": "339ohji",
                "Id": "54j1r29",
                "Name": "Example-Environment",
                "State": "ReadyForDeployment"
            }
        ]
    }

For more information, see `Step 2: Creating an environment <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html>`__ in the *AWS AppConfig User Guide*.