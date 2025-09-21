**To create a rule that sends an Amazon SNS alert**

The following ``create-topic-rule`` example creates a rule that sends an Amazon SNS message when soil moisture level readings, as found in a device shadow, are low. ::

    aws iot create-topic-rule \
        --rule-name "LowMoistureRule" \
        --topic-rule-payload file://plant-rule.json

The example requires the following JSON code to be saved to a file named ``plant-rule.json``::

    {
        "sql": "SELECT * FROM '$aws/things/MyRPi/shadow/update/accepted' WHERE state.reported.moisture = 'low'\n",
        "description": "Sends an alert whenever soil moisture level readings are too low.",
        "ruleDisabled": false,
        "awsIotSqlVersion": "2016-03-23",
        "actions": [{
                "sns": {
                    "targetArn": "arn:aws:sns:us-west-2:123456789012:MyRPiLowMoistureTopic",
                    "roleArn": "arn:aws:iam::123456789012:role/service-role/MyRPiLowMoistureTopicRole",
                    "messageFormat": "RAW"
                }
        }]
    }

This command produces no output.

For more information, see `Creating an AWS IoT Rule <https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-rule.html>`__ in the *AWS IoT Developers Guide*.

