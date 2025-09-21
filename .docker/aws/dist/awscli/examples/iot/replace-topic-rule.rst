**To update a topic's rule definition**

The following ``replace-topic-rule`` example updates the specified rule to send an SNS alert when soil moisture level readings are too low. ::

    aws iot replace-topic-rule \
        --rule-name MyRPiLowMoistureAlertRule \
        --topic-rule-payload "{\"sql\": \"SELECT * FROM '$aws/things/MyRPi/shadow/update/accepted' WHERE state.reported.moisture = 'low'\", \"description\": \"Sends an alert when soil moisture level readings are too low.\",\"actions\": [{\"sns\":{\"targetArn\":\"arn:aws:sns:us-west-2:123456789012:MyRPiLowMoistureTopic\",\"roleArn\":\"arn:aws:iam::123456789012:role/service-role/MyRPiLowMoistureTopicRole\",\"messageFormat\": \"RAW\"}}],\"ruleDisabled\": false,\"awsIotSqlVersion\":\"2016-03-23\"}"

This command produces no output.

For more information, see `Creating an AWS IoT Rule <https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-rule.html>`__ in the *AWS IoT Developer Guide*.
