**To disassociate the partner account from the AWS account**

The following ``disassociate-aws-account-from-partner-account`` example disassociates a partner account from your currently associated AWS account. ::

    aws iotwireless disassociate-aws-account-from-partner-account \
        --partner-account-id "12345678901234" \
        --partner-type "Sidewalk"

This command produces no output.

For more information, see `Add your gateways and wireless devices to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-onboard-devices.html>`__ in the *AWS IoT Developers Guide*.
