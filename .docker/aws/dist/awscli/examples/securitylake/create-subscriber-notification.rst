**To create a subscriber notification**

The following ``create-subscriber-notification`` example shows how to specify subscriber notification to create a notification when new data is written to the data lake. ::

    aws securitylake create-subscriber-notification \
        --subscriber-id "12345ab8-1a34-1c34-1bd4-12345ab9012" \
        --configuration '{"httpsNotificationConfiguration": {"targetRoleArn":"arn:aws:iam::XXX:role/service-role/RoleName", "endpoint":"https://account-management.$3.$2.securitylake.aws.dev/v1/datalake"}}'

Output::

    {
        "subscriberEndpoint": [
            "https://account-management.$3.$2.securitylake.aws.dev/v1/datalake"
        ]
    }

For more information, see `Subscriber management <https://docs.aws.amazon.com/security-lake/latest/userguide/subscriber-management.html>`__ in the *Amazon Security Lake User Guide*.