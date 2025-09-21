**To list your rules**

The following ``list-topic-rules`` example lists all rules that you have defined. ::

    aws iot list-topic-rules

Output::

    {
        "rules": [
            {
                "ruleArn": "arn:aws:iot:us-west-2:123456789012:rule/MyRPiLowMoistureAlertRule",
                "ruleName": "MyRPiLowMoistureAlertRule",
                "topicPattern": "$aws/things/MyRPi/shadow/update/accepted",
                "createdAt": 1558624363.0,
                "ruleDisabled": false
            },
            {
                "ruleArn": "arn:aws:iot:us-west-2:123456789012:rule/MyPlantPiMoistureAlertRule",
                "ruleName": "MyPlantPiMoistureAlertRule",
                "topicPattern": "$aws/things/MyPlantPi/shadow/update/accepted",
                "createdAt": 1541458459.0,
                "ruleDisabled": false
            }
        ]
    }

For more information, see `Viewing Your Rules <https://docs.aws.amazon.com/iot/latest/developerguide/iot-view-rules.htmlget-topic-rule>`__ in the *AWS IoT Developers Guide*.
