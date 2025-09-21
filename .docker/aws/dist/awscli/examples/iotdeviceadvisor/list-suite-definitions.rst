**Example 1: To list the IoT Device Advisor test suites you created**

The following ``list-suite-definitions`` example lists up to 25 device advisor test suites you created in AWS IoT. If you have more than 25 test suites, the "nextToken" will be shown in the output. You can use this "nextToken" to show the rest of the test suites you created. ::

    aws iotdeviceadvisor list-suite-definitions 

Output::

    {
        "suiteDefinitionInformationList": [
            {
                "suiteDefinitionId": "3hsn88h4p2g5",
                "suiteDefinitionName": "TestSuite1",
                "defaultDevices": [
                    {
                        "thingArn": "arn:aws:iot:us-east-1:123456789012:thing/MyIotThing"
                    }
                ],
                "intendedForQualification": false,
                "isLongDurationTest": false,
                "protocol": "MqttV3_1_1",
                "createdAt": "2022-11-17T14:15:56.830000-05:00"
            },
            {
                ......
            }
        ],
        "nextToken": "nextTokenValue"
    }

**Example 2: To list the IoT Device Advisor test suites you created with the specified settings**

The following ``list-suite-definitions`` example lists device advisor test suites you created in AWS IoT with the specified max-result number. If you have more test suites than the max number, the "nextToken" will be shown in the output. If you have "nextToken", you can use "nextToken" to show the test suites you created that weren't shown before. ::

    aws iotdeviceadvisor list-suite-definitions \
        --max-result 1 \
        --next-token "nextTokenValue"

Output::

    {
        "suiteDefinitionInformationList": [
            {
                "suiteDefinitionId": "ztvb5aew4w4x",
                "suiteDefinitionName": "TestSuite2",
                "defaultDevices": [],
                "intendedForQualification": true,
                "isLongDurationTest": false,
                "protocol": "MqttV3_1_1",
                "createdAt": "2022-11-17T14:15:56.830000-05:00"
            }
        ],
        "nextToken": "nextTokenValue"
    }

For more information, see `ListSuiteDefinitions <https://docs.aws.amazon.com/iot/latest/apireference/API_iotdeviceadvisor_ListSuiteDefinitions.html>`__ in the *AWS IoT API Reference*.
