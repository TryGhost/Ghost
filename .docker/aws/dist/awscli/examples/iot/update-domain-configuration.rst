**To update a domain configuration**

The following ``update-domain-configuration`` example disables the specified domain configuration. ::

    aws iot update-domain-configuration \
        --domain-configuration-name "additionalDataDomain" \
        --domain-configuration-status "DISABLED"

Output::

    {
        "domainConfigurationName": "additionalDataDomain",
        "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/additionalDataDomain/dikMh"
    }

For more information, see `Configurable Endpoints <https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-aws.html>`__ in the *AWS IoT Developer Guide*.
