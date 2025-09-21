**To list the entities that are affected by a specified AWS Health event**

The following ``describe-affected-entities`` example lists the entities that are affected by the specified AWS Health event. This event is a billing notification for the AWS account. ::

    aws health describe-affected-entities \
        --filter "eventArns=arn:aws:health:global::event/BILLING/AWS_BILLING_NOTIFICATION/AWS_BILLING_NOTIFICATION_6ce1d874-e995-40e2-99cd-EXAMPLE11145" \
        --region us-east-1

Output::

    {
        "entities": [
            {
                "entityArn": "arn:aws:health:global:123456789012:entity/EXAMPLEimSMoULmWHpb",
                "eventArn": "arn:aws:health:global::event/BILLING/AWS_BILLING_NOTIFICATION/AWS_BILLING_NOTIFICATION_6ce1d874-e995-40e2-99cd-EXAMPLE11145",
                "entityValue": "AWS_ACCOUNT",
                "awsAccountId": "123456789012",
                "lastUpdatedTime": 1588356454.08
            }
        ]
    }

For more information, see `Event log <https://docs.aws.amazon.com/health/latest/ug/getting-started-phd.html#event-log>`__ in the *AWS Health User Guide*.