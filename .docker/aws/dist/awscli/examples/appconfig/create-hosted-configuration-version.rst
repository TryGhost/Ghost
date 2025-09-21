**To create a hosted configuration version**

The following ``create-hosted-configuration-version`` example creates a new configuration in the AWS AppConfig hosted configuration store. The configuration content must first be converted to base64. ::

    aws appconfig create-hosted-configuration-version \
        --application-id "339ohji" \
        --configuration-profile-id "ur8hx2f" \
        --content eyAiTmFtZSI6ICJFeGFtcGxlQXBwbGljYXRpb24iLCAiSWQiOiBFeGFtcGxlSUQsICJSYW5rIjogNyB9 \
        --content-type "application/json" \
        configuration_version_output_file

Contents of ``configuration_version_output_file``::

    { "Name": "ExampleApplication", "Id": ExampleID, "Rank": 7 }

Output::

    {
        "ApplicationId": "339ohji",
        "ConfigurationProfileId": "ur8hx2f",
        "VersionNumber": "1",
        "ContentType": "application/json"
    }


For more information, see `About the AWS AppConfig hosted configuration store <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile.html#appconfig-creating-configuration-and-profile-about-hosted-store>`__ in the *AWS Appconfig User Guide*.