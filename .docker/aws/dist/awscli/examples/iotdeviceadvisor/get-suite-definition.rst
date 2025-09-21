**To get the information about an IoT Device Advisor test suite**

The following ``get-suite-definition`` example get the information about a aevice advisor test suite with the specified suite definition ID. ::

    aws iotdeviceadvisor get-suite-definition \
        --suite-definition-id qqcsmtyyjabl

Output::

    {
        "suiteDefinitionId": "qqcsmtyyjabl",
        "suiteDefinitionArn": "arn:aws:iotdeviceadvisor:us-east-1:123456789012:suitedefinition/qqcsmtyyjabl",
        "suiteDefinitionVersion": "v1",
        "latestVersion": "v1",
        "suiteDefinitionConfiguration": {
            "suiteDefinitionName": "MQTT connection",
            "devices": [],
            "intendedForQualification": false,
            "isLongDurationTest": false,
            "rootGroup": "{\"configuration\":{},\"tests\":[{\"id\":\"uta5d9j1kvwc\",\"name\":\"Test group 1\",\"configuration\":{},\"tests\":[{\"id\":\"awr8pq5vc9yp\",\"name\":\"MQTT Connect\",\"configuration\":{},\"test\":{\"id\":\"MQTT_Connect\",\"testCase\":null,\"version\":\"0.0.0\"}}]}]}",
            "devicePermissionRoleArn": "arn:aws:iam::123456789012:role/Myrole",
            "protocol": "MqttV3_1_1"
        },
        "createdAt": "2022-11-11T22:28:52.389000-05:00",
        "lastModifiedAt": "2022-11-11T22:28:52.389000-05:00",
        "tags": {}
    }

For more information, see `Get a test suite definition <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-create-suite-definition>`__ in the *AWS IoT Core Developer Guide*.
