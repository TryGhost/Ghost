**To retrieve the current logging options**

The following ``describe-logging-options`` example displays the current AWS IoT Analytics logging options. ::

    aws iotanalytics describe-logging-options

This command produces no output.
Output::

    {
        "loggingOptions": {
            "roleArn": "arn:aws:iam::123456789012:role/service-role/myIoTAnalyticsRole",
            "enabled": true,
            "level": "ERROR"
        }
    }

For more information, see `DescribeLoggingOptions <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_DescribeLoggingOptions.html>`__ in the *AWS IoT Analytics API Reference*.
