**To set up log export from a user pool**

The following ``set-log-delivery-configuration`` example configures the requested user pool with user-notification error logging to a log group and user-authentication info logging to an S3 bucket. ::

    aws cognito-idp set-log-delivery-configuration \
        --user-pool-id us-west-2_EXAMPLE \
        --log-configurations LogLevel=ERROR,EventSource=userNotification,CloudWatchLogsConfiguration={LogGroupArn=arn:aws:logs:us-west-2:123456789012:log-group:cognito-exported} LogLevel=INFO,EventSource=userAuthEvents,S3Configuration={BucketArn=arn:aws:s3:::amzn-s3-demo-bucket1}

Output::

    {
       "LogDeliveryConfiguration": {
            "LogConfigurations": [
                {
                    "CloudWatchLogsConfiguration": {
                        "LogGroupArn": "arn:aws:logs:us-west-2:123456789012:log-group:cognito-exported"
                    },
                    "EventSource": "userNotification",
                    "LogLevel": "ERROR"
                },
                {
                    "EventSource": "userAuthEvents",
                    "LogLevel": "INFO",
                    "S3Configuration": {
                        "BucketArn": "arn:aws:s3:::amzn-s3-demo-bucket1"
                    }
                }
            ],
            "UserPoolId": "us-west-2_EXAMPLE"
       }
    }

For more information, see `Exporting user pool logs <https://docs.aws.amazon.com/cognito/latest/developerguide/exporting-quotas-and-usage.html>`__ in the *Amazon Cognito Developer Guide*.
