**To delete a device's shadow document**

The following ``delete-thing-shadow`` example deletes the entire shadow document for the device named ``MyRPi``. ::

    aws iot-data delete-thing-shadow \
        --thing-name MyRPi \
        "output.txt"

The command produces no output on the display, but ``output.txt`` contains information that confirms the version and timestamp of the shadow document that you deleted. ::

    {"version":2,"timestamp":1560270384}

For more information, see `Using Shadows <https://docs.aws.amazon.com/iot/latest/developerguide/using-device-shadows.html>`__ in the *AWS IoT Developers Guide*.

