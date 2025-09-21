**To display the log delivery configuration**

The following ``get-log-delivery-configuration`` example displays the log export settings of the requested user pool. ::

    aws cognito-idp get-log-delivery-configuration \
        --user-pool-id us-west-2_EXAMPLE

Output::

    {
        "LogDeliveryConfiguration": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "LogConfigurations": [
                {
                    "LogLevel": "INFO",
                    "EventSource": "userAuthEvents",
                    "FirehoseConfiguration": {
                        "StreamArn": "arn:aws:firehose:us-west-2:123456789012:deliverystream/my-test-deliverystream"
                    }
                },
                {
                    "LogLevel": "ERROR",
                    "EventSource": "userNotification",
                    "CloudWatchLogsConfiguration": {
                        "LogGroupArn": "arn:aws:logs:us-west-2:123456789012:log-group:my-message-delivery-logs"
                    }
                }
            ]
        }
    }

For more information, see `Exporting user pool logs <https://docs.aws.amazon.com/cognito/latest/developerguide/exporting-quotas-and-usage.html>`__ in the *Amazon Cognito Developer Guide*.
