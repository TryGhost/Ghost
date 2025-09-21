**To update a thing shadow**

The following ``update-thing-shadow`` example modifies the current state of the device shadow for the specified thing and saves it to the file ``output.txt``. ::

    aws iot-data update-thing-shadow \
        --cli-binary-format raw-in-base64-out \
        --thing-name MyRPi \
        --payload '{"state":{"reported":{"moisture":"okay"}}}' \
        "output.txt"

The command produces no output on the display, but the following shows the contents of ``output.txt``::

    {
        "state": {
            "reported": {
                "moisture": "okay"
            }
        },
        "metadata": {
            "reported": {
                "moisture": {
                    "timestamp": 1560270036
                }
            }
        },
        "version": 2,
        "timestamp": 1560270036
    }

For more information, see `Device Shadow Service Data Flow <https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-data-flow.html>`__ in the *AWS IoT Developers Guide*.
