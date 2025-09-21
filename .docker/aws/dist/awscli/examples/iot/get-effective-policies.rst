**To list the policies that effect a thing**

The following ``get-effective-policies`` example lists the policies that effect the specified thing, including policies attached to any groups to which it belongs. ::

    aws iot get-effective-policies \
        --thing-name TemperatureSensor-001 \
        --principal arn:aws:iot:us-west-2:123456789012:cert/488b6a7f2acdeb00a77384e63c4e40b18b1b3caaae57b7272ba44c45e3448142

Output::

    {
        "effectivePolicies": [
            {
                "policyName": "TemperatureSensorPolicy",
                "policyArn": "arn:aws:iot:us-west-2:123456789012:policy/TemperatureSensorPolicy",
                "policyDocument": "{
                    \"Version\": \"2012-10-17\",
                    \"Statement\": [
                        {
                            \"Effect\": \"Allow\",
                            \"Action\": [
                                \"iot:Publish\",
                                \"iot:Receive\"
                            ],
                            \"Resource\": [
                                \"arn:aws:iot:us-west-2:123456789012:topic/topic_1\",
                                \"arn:aws:iot:us-west-2:123456789012:topic/topic_2\"
                            ]
                        },
                        {
                            \"Effect\": \"Allow\",
                            \"Action\": [
                                \"iot:Subscribe\"
                            ],
                            \"Resource\": [
                                \"arn:aws:iot:us-west-2:123456789012:topicfilter/topic_1\",
                                \"arn:aws:iot:us-west-2:123456789012:topicfilter/topic_2\"
                            ]
                        },
                        {
                            \"Effect\": \"Allow\",
                            \"Action\": [
                                \"iot:Connect\"
                            ],
                            \"Resource\": [
                                \"arn:aws:iot:us-west-2:123456789012:client/basicPubSub\"
                            ]
                        }
                    ]
                }"
            }
        ]
    }

For more information, see `Get Effective Policies for a Thing <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html#group-get-effective-policies>`__ in the *AWS IoT Developers Guide*.
