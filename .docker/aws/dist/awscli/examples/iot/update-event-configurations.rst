**To show which event types are published**

The following ``update-event-configurations`` example updates the configuration to enable messages when the CA certificate is added, updated, or deleted. ::

    aws iot update-event-configurations \
        --event-configurations "{\"CA_CERTIFICATE\":{\"Enabled\":true}}"

This command produces no output.

For more information, see `Event Messages <https://docs.aws.amazon.com/iot/latest/developerguide/iot-events.html>`__ in the *AWS IoT Developer Guide*.
