**To list the current logging options**

The following ``get-v2-logging-options`` example lists the current logging options for AWS IoT. ::

    aws iot get-v2-logging-options

Output::

    {
        "roleArn": "arn:aws:iam::094249569039:role/service-role/iotLoggingRole",
        "defaultLogLevel": "WARN",
        "disableAllLogs": false
    }

For more information, see `title <link>`__ in the *AWS IoT Developer Guide*.
