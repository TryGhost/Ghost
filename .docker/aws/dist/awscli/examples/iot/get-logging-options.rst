**To get the logging options**

The following ``get-logging-options`` example gets the current logging options for your AWS account. ::

    aws iot get-logging-options

Output::

    {
        "roleArn": "arn:aws:iam::123456789012:role/service-role/iotLoggingRole",
        "logLevel": "ERROR"
    }

For more information, see `title <link>`__ in the *AWS IoT Developer Guide*.
