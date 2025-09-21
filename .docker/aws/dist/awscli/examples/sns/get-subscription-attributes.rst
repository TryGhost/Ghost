**To retrieve subscription attributes for a topic**

The following ``get-subscription-attributes`` displays the attributes of the specified subscription. You can get the ``subscription-arn`` from the output of the ``list-subscriptions`` command. ::

    aws sns get-subscription-attributes \
        --subscription-arn "arn:aws:sns:us-west-2:123456789012:my-topic:8a21d249-4329-4871-acc6-7be709c6ea7f"

Output::

    {
        "Attributes": {
            "Endpoint": "my-email@example.com",
            "Protocol": "email",
            "RawMessageDelivery": "false",
            "ConfirmationWasAuthenticated": "false",
            "Owner": "123456789012",
            "SubscriptionArn": "arn:aws:sns:us-west-2:123456789012:my-topic:8a21d249-4329-4871-acc6-7be709c6ea7f",
            "TopicArn": "arn:aws:sns:us-west-2:123456789012:my-topic"
        }
    }
