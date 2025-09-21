**To create a domain configuration**

The following ``create-domain-configuration`` example creates an AWS-managed domain configuration with a service type of ``DATA``. ::

    aws iot create-domain-configuration \
        --domain-configuration-name "additionalDataDomain" \
        --service-type "DATA"

Output::

    {
        "domainConfigurationName": "additionalDataDomain",
        "domainConfigurationArn": "arn:aws:iot:us-west-2:123456789012:domainconfiguration/additionalDataDomain/dikMh"
    }

For more information, see `Configurable Endpoints <https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-aws.html>`__ in the *AWS IoT Developer Guide*.
