**To create a topic rule destination**

The following ``create-topic-rule-destination`` example creates a topic rule destination for an HTTP endpoint. ::

    aws iot create-topic-rule-destination \
        --destination-configuration httpUrlConfiguration={confirmationUrl=https://example.com}

Output::

    {
        "topicRuleDestination": {
            "arn": "arn:aws:iot:us-west-2:123456789012:ruledestination/http/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "status": "IN_PROGRESS",
            "statusReason": "Awaiting confirmation. Confirmation message sent on 2020-07-09T22:47:54.154Z; no response received from the endpoint.",
            "httpUrlProperties": {
                "confirmationUrl": "https://example.com"
            }
        }
    }

For more information, see `Creating a topic rule destination <https://docs.aws.amazon.com/iot/latest/developerguide/rule-destination.html#create-destination>`__ in the *AWS IoT Developer Guide*.