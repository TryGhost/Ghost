**To describe a domain configuration**

The following ``describe-domain-configuration`` example displays details about the specified domain configuration. ::

    aws iot describe-domain-configuration \
        --domain-configuration-name "additionalDataDomain"

Output::

    {
        "domainConfigurationName": "additionalDataDomain",
        "domainConfigurationArn": "arn:aws:iot:us-east-1:758EXAMPLE143:domainconfiguration/additionalDataDomain/norpw",
        "domainName": "d055exampleed74y71zfd-ats.beta.us-east-1.iot.amazonaws.com",
        "serverCertificates": [],
        "domainConfigurationStatus": "ENABLED",
        "serviceType": "DATA",
        "domainType": "AWS_MANAGED",
        "lastStatusChangeDate": 1601923783.774
    }

For more information, see `Configurable Endpoints <https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-aws.html>`__ in the *AWS IoT Developer Guide*.
