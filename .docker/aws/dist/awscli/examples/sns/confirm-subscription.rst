**To confirm a subscription**

The following ``confirm-subscription`` command completes the confirmation process started when you subscribed to an SNS topic named ``my-topic``. The --token parameter comes from the confirmation message sent to the notification endpoint specified in the subscribe call. ::

    aws sns confirm-subscription \
        --topic-arn arn:aws:sns:us-west-2:123456789012:my-topic \
        --token 2336412f37fb687f5d51e6e241d7700ae02f7124d8268910b858cb4db727ceeb2474bb937929d3bdd7ce5d0cce19325d036bc858d3c217426bcafa9c501a2cace93b83f1dd3797627467553dc438a8c974119496fc3eff026eaa5d14472ded6f9a5c43aec62d83ef5f49109da7176391

Output::

    {
        "SubscriptionArn": "arn:aws:sns:us-west-2:123456789012:my-topic:8a21d249-4329-4871-acc6-7be709c6ea7f"
    }
