**To list details of an application**

The following ``get-application`` example lists the details of the specified application. ::

    aws appconfig get-application \
        --application-id 339ohji

Output::

    {
        "Description": "An application used for creating an example.",
        "Id": "339ohji",
        "Name": "example-application"
    }

For more information, see `How AWS AppConfig works <https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html#learn-more-appconfig-how-it-works>`__ in the *AWS AppConfig User Guide*.
