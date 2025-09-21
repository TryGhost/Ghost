**To update an application**

The following ``update-application`` example updates the name of the specified application. ::

    aws appconfig update-application \
        --application-id 339ohji \
        --name "Example-Application"

Output::

    {
        "Id": "339ohji",
        "Name": "Example-Application",
        "Description": "An application used for creating an example."
    }

For more information, see `Step 1: Creating an AWS AppConfig application <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-application.html>`__ in the *AWS AppConfig User Guide*.