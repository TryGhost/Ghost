**To update the properties of a partner account**

The following ``update-partner-account`` updates the ``AppServerPrivateKey`` for the account that has the specified ID. ::

    aws iotwireless update-partner-account \
        --partner-account-id "78965678771228" \
        --partner-type "Sidewalk" \
        --sidewalk AppServerPrivateKey="f798ab4899346a88599180fee9e14fa1ada7b6df989425b7c6d2146dd6c815bb"

This command produces no output.

For more information, see `Amazon Sidewalk Integration for AWS IoT Core <https://docs.aws.amazon.com/iot/latest/developerguide/iot-sidewalk.html>`__ in the *AWS IoT Developers Guide*.