**To get information about a rule**

The following ``get-topic-rule`` example gets information about the specified rule. ::

    aws iot get-topic-rule \
        --rule-name MyRPiLowMoistureAlertRule

Output::

    {
        "ruleArn": "arn:aws:iot:us-west-2:123456789012:rule/MyRPiLowMoistureAlertRule",
        "rule": {
            "ruleName": "MyRPiLowMoistureAlertRule",
            "sql": "SELECT * FROM '$aws/things/MyRPi/shadow/update/accepted' WHERE state.reported.moisture = 'low'\n                    ",
            "description": "Sends an alert whenever soil moisture level readings are too low.",
            "createdAt": 1558624363.0,
            "actions": [
                {
                    "sns": {
                        "targetArn": "arn:aws:sns:us-west-2:123456789012:MyRPiLowMoistureTopic",
                        "roleArn": "arn:aws:iam::123456789012:role/service-role/MyRPiLowMoistureTopicRole",
                        "messageFormat": "RAW"
                    }
                }
            ],
            "ruleDisabled": false,
            "awsIotSqlVersion": "2016-03-23"
        }
    }

For more information, see `Viewing Your Rules <https://docs.aws.amazon.com/iot/latest/developerguide/iot-view-rules.htmlget-topic-rule>`__ in the *AWS IoT Developers Guide*.

