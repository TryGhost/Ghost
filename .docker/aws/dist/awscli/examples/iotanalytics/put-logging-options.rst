**To set or update logging options**

The following ``put-logging-options`` example sets or updates the AWS IoT Analytics logging options. If you update the value of any ``loggingOptions`` field, it can take up to one minute for the change to take effect. Also, if you change the policy attached to the role you specified in the "roleArn" field (for example, to correct an invalid policy) it can take up to five minutes for that change to take effect. ::

    aws iotanalytics put-logging-options \
        --cli-input-json file://put-logging-options.json

Contents of ``put-logging-options.json``::

    {
        "loggingOptions": {
            "roleArn": "arn:aws:iam::123456789012:role/service-role/myIoTAnalyticsRole",
            "level": "ERROR",
            "enabled": true
        }
    }

This command produces no output.

For more information, see `PutLoggingOptions <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_PutLoggingOptions.html>`__ in the *AWS IoT Analytics API Reference*.
