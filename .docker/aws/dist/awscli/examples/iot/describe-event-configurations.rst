**To show which event types are published**

The following ``describe-event-configurations`` example lists the configuration that controls which events are generated when something is added, updated, or deleted. ::

    aws iot describe-event-configurations

Output::

    {
        "eventConfigurations": {
            "CA_CERTIFICATE": {
                "Enabled": false
            },
            "CERTIFICATE": {
                "Enabled": false
            },
            "JOB": {
                "Enabled": false
            },
            "JOB_EXECUTION": {
                "Enabled": false
            },
            "POLICY": {
                "Enabled": false
            },
            "THING": {
                "Enabled": false
            },
            "THING_GROUP": {
                "Enabled": false
            },
            "THING_GROUP_HIERARCHY": {
                "Enabled": false
            },
            "THING_GROUP_MEMBERSHIP": {
                "Enabled": false
            },
            "THING_TYPE": {
                "Enabled": false
            },
            "THING_TYPE_ASSOCIATION": {
                "Enabled": false
            }
        }
    }

For more information, see `Event Messages <https://docs.aws.amazon.com/iot/latest/developerguide/iot-events.html>`__ in the *AWS IoT Developer Guide*.
