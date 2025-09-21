**To retrieve configuration details**

The following ``get-configuration`` example returns the configuration details of the example application. On subsequent calls to get-configuration use the ``client-configuration-version`` parameter to only update the configuration of your application if the version has changed. Only updating the configuration when the version has changed avoids excess charges incurred by calling get-configuration. ::

    aws appconfig get-configuration \
        --application "example-application" \
        --environment "Example-Environment" \
        --configuration "Example-Configuration-Profile" \
        --client-id "test-id" \
        configuration-output-file

Contents of ``configuration-output-file``::

    { "Name": "ExampleApplication", "Id": ExampleID, "Rank": 7 }

Output::

    {
        "ConfigurationVersion": "1",
        "ContentType": "application/json"
    }

For more information, see `Step 6: Receiving the configuration <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-retrieving-the-configuration.html>`__ in the *AWS AppConfig User Guide*.