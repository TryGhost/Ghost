**Example 1: To create an IoT Device Advisor test suite**

The following ``create-suite-definition`` example creates a device advisor test suite in the AWS IoT with the specified suite definition configuration. ::

    aws iotdeviceadvisor create-suite-definition \
        --suite-definition-configuration '{ \
            "suiteDefinitionName": "TestSuiteName", \
            "devices": [{"thingArn":"arn:aws:iot:us-east-1:123456789012:thing/MyIotThing"}], \
            "intendedForQualification": false, \
            "rootGroup": "{\"configuration\":{},\"tests\":[{\"name\":\"MQTT Connect\",\"configuration\":{\"EXECUTION_TIMEOUT\":120},\"tests\":[{\"name\":\"MQTT_Connect\",\"configuration\":{},\"test\":{\"id\":\"MQTT_Connect\",\"testCase\":null,\"version\":\"0.0.0\"}}]}]}", \
            "devicePermissionRoleArn": "arn:aws:iam::123456789012:role/Myrole"}'

Output::

    {
        "suiteDefinitionId": "0jtsgio7yenu",
        "suiteDefinitionArn": "arn:aws:iotdeviceadvisor:us-east-1:123456789012:suitedefinition/0jtsgio7yenu",
        "suiteDefinitionName": "TestSuiteName",
        "createdAt": "2022-12-02T11:38:13.263000-05:00"
    }

For more information, see `Create a test suite definition <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-create-suite-definition>`__ in the *AWS IoT Core Developer Guide*.

**Example 2: To create an IoT Device Advisor Latest Qualification test suite**

The following ``create-suite-definition`` example creates a device advisor qualification test suite with the latest version in the AWS IoT with the specified suite definition configuration. ::

    aws iotdeviceadvisor create-suite-definition \
        --suite-definition-configuration '{ \
            "suiteDefinitionName": "TestSuiteName", \
            "devices": [{"thingArn":"arn:aws:iot:us-east-1:123456789012:thing/MyIotThing"}], \
            "intendedForQualification": true, \
            "rootGroup": "", \
            "devicePermissionRoleArn": "arn:aws:iam::123456789012:role/Myrole"}'

Output::

    {
        "suiteDefinitionId": "txgsuolk2myj",
        "suiteDefinitionArn": "arn:aws:iotdeviceadvisor:us-east-1:123456789012:suitedefinition/txgsuolk2myj",
        "suiteDefinitionName": "TestSuiteName",
        "createdAt": "2022-12-02T11:38:13.263000-05:00"
    }

For more information, see `Create a test suite definition <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-create-suite-definition>`__ in the *AWS IoT Core Developer Guide*.