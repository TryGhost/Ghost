**To create an AWS IoT policy**

The following ``create-policy`` example creates an AWS IoT policy named TemperatureSensorPolicy. The ``policy.json`` file contains statements that allow AWS IoT policy actions. ::

    aws iot create-policy \
        --policy-name TemperatureSensorPolicy \
        --policy-document file://policy.json

Contents of ``policy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "iot:Publish",
                    "iot:Receive"
                ],
                "Resource": [
                    "arn:aws:iot:us-west-2:123456789012:topic/topic_1",
                    "arn:aws:iot:us-west-2:123456789012:topic/topic_2"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "iot:Subscribe"
                ],
                "Resource": [
                    "arn:aws:iot:us-west-2:123456789012:topicfilter/topic_1",
                    "arn:aws:iot:us-west-2:123456789012:topicfilter/topic_2"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "iot:Connect"
                ],
                "Resource": [
                    "arn:aws:iot:us-west-2:123456789012:client/basicPubSub"
                ]
            }
        ]
    }

Output::

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
        }",
        "policyVersionId": "1"
    }

For more information, see `AWS IoT Policies <https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html>`__ in the *AWS IoT Developers Guide*.
