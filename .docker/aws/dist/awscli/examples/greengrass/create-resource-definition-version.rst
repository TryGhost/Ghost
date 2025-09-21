**To create a version of a resource definition**

The following ``create-resource-definition-version`` example creates a new version of a TwilioAuthToken. ::

    aws greengrass create-resource-definition-version \
        --resource-definition-id "c8bb9ebc-c3fd-40a4-9c6a-568d75569d38" \
        --resources "[{\"Id\": \"TwilioAuthToken\",\"Name\": \"MyTwilioAuthToken\",\"ResourceDataContainer\": {\"SecretsManagerSecretResourceData\": {\"ARN\": \"arn:aws:secretsmanager:us-west-2:123456789012:secret:greengrass-TwilioAuthToken-ntSlp6\"}}}]"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/c8bb9ebc-c3fd-40a4-9c6a-568d75569d38/versions/b3bcada0-5fb6-42df-bf0b-1ee4f15e769e",
        "CreationTimestamp": "2019-06-24T21:17:25.623Z",
        "Id": "c8bb9ebc-c3fd-40a4-9c6a-568d75569d38",
        "Version": "b3bcada0-5fb6-42df-bf0b-1ee4f15e769e"
    }
