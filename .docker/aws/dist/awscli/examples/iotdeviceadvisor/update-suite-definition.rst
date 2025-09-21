**Example 1: To update an IoT Device Advisor test suite**

The following ``update-suite-definition`` example updates a device advisor test suite in the AWS IoT with the specified suite definition ID and suite definition configuration. ::

    aws iotdeviceadvisor update-suite-definition \
        --suite-definition-id 3hsn88h4p2g5 \
        --suite-definition-configuration '{ \
            "suiteDefinitionName": "TestSuiteName", \
            "devices": [{"thingArn":"arn:aws:iot:us-east-1:123456789012:thing/MyIotThing"}], \
            "intendedForQualification": false, \
            "rootGroup": "{\"configuration\":{},\"tests\":[{\"name\":\"MQTT Connect\",\"configuration\":{\"EXECUTION_TIMEOUT\":120},\"tests\":[{\"name\":\"MQTT_Connect\",\"configuration\":{},\"test\":{\"id\":\"MQTT_Connect\",\"testCase\":null,\"version\":\"0.0.0\"}}]}]}", \
            "devicePermissionRoleArn": "arn:aws:iam::123456789012:role/Myrole"}'

Output::

    {
        "suiteDefinitionId": "3hsn88h4p2g5",
        "suiteDefinitionName": "TestSuiteName",
        "suiteDefinitionVersion": "v3",
        "createdAt": "2022-11-17T14:15:56.830000-05:00",
        "lastUpdatedAt": "2022-12-02T16:02:45.857000-05:00"
    }

**Example 2: To update an IoT Device Advisor Qualification test suite**

The following ``update-suite-definition`` example updates a device advisor qualification test suite in the AWS IoT with the specified suite definition ID and suite definition configuration. ::

    aws iotdeviceadvisor update-suite-definition \
        --suite-definition-id txgsuolk2myj \
        --suite-definition-configuration '{
            "suiteDefinitionName": "TestSuiteName", \
            "devices": [{"thingArn":"arn:aws:iot:us-east-1:123456789012:thing/MyIotThing"}], \
            "intendedForQualification": true, \
            "rootGroup": "", \
            "devicePermissionRoleArn": "arn:aws:iam::123456789012:role/Myrole"}'

Output::

    {
        "suiteDefinitionId": "txgsuolk2myj",
        "suiteDefinitionName": "TestSuiteName",
        "suiteDefinitionVersion": "v3",
        "createdAt": "2022-11-17T14:15:56.830000-05:00",
        "lastUpdatedAt": "2022-12-02T16:02:45.857000-05:00"
    }

For more information, see `UpdateSuiteDefinition <https://docs.aws.amazon.com/iot/latest/apireference/API_iotdeviceadvisor_UpdateSuiteDefinition.html>`__ in the *AWS IoT API Reference*.