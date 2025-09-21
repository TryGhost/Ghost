**To delete a domain configuration**

The following ``delete-domain-configuration`` example deletes a domain configuration named ``additionalDataDomain`` from your AWS account. ::

    aws iot delete-domain-configuration \
        --domain-configuration-name "additionalDataDomain" \
        --domain-configuration-status "OK"

This command produces no output.

For more information, see `Configurable Endpoints <https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-aws.html>`__ in the *AWS IoT Developer Guide*.