**To create an application**

The following ``create-application`` example creates an application in AWS AppConfig. ::

    aws appconfig create-application \
        --name "example-application" \
        --description "An application used for creating an example."

Output::

    {
        "Description": "An application used for creating an example.",
        "Id": "339ohji",
        "Name": "example-application"
    }

For more information, see `Step 1: Creating an AWS AppConfig application <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-application.html>`__ in the *AWS AppConfig User Guide*.