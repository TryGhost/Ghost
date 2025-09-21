**To get information about logging settings**

The following ``describe-logging-options`` example retrieves the current AWS IoT Events logging options. ::

    aws iotevents describe-logging-options

Output::

    {
        "loggingOptions": {
            "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole", 
            "enabled": false, 
            "level": "ERROR"
        }
    }

For more information, see `DescribeLoggingOptions <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-DescribeLoggingOptions>`__ in the *AWS IoT Events Developer Guide**.
