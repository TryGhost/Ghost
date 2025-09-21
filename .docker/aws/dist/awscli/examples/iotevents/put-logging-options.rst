**To set logging options**

The following ``put-logging-options`` example sets or updates the AWS IoT Events logging options. If you update the value of any ``loggingOptions` field, it can take up to one minute for the change to take effect. Also, if you change the policy attached to the role you specified in the ``roleArn`` field (for example, to correct an invalid policy) it can take up to five minutes for that change to take effect. ::

    aws iotevents put-logging-options \
        --cli-input-json file://logging-options.json

Contents of ``logging-options.json``::

    {
        "loggingOptions": {
            "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole",
            "level": "DEBUG", 
            "enabled": true, 
            "detectorDebugOptions": [
                {
                    "detectorModelName": "motorDetectorModel", 
                    "keyValue": "Fulton-A32"
                }
            ]
        }
    }

This command produces no output.

For more information, see `PutLoggingOptions <https://docs.aws.amazon.com/iotevents/latest/apireference/API_PutLoggingOptions>`__ in the *AWS IoT Events API Reference*.
