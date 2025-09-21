**To get the information about an IoT Device Advisor test suite run status**

The following ``get-suite-run`` example gets the information about a device advisor test suite run status with the specified suite definition ID and suite run ID. ::

    aws iotdeviceadvisor get-suite-run \
        --suite-definition-id qqcsmtyyjabl \
        --suite-run-id nzlfyhaa18oa

Output::

    {
        "suiteDefinitionId": "qqcsmtyyjabl",
        "suiteDefinitionVersion": "v1",
        "suiteRunId": "nzlfyhaa18oa",
        "suiteRunArn": "arn:aws:iotdeviceadvisor:us-east-1:123456789012:suiterun/qqcsmtyyjabl/nzlfyhaa18oa",
        "suiteRunConfiguration": {
            "primaryDevice": {
                "thingArn": "arn:aws:iot:us-east-1:123456789012:thing/MyIotThing",
                "certificateArn": "arn:aws:iot:us-east-1:123456789012:cert/certFile"
            },
            "parallelRun": false
        },
        "testResult": {
            "groups": [
                {
                    "groupId": "uta5d9j1kvwc",
                    "groupName": "Test group 1",
                    "tests": [
                        {
                            "testCaseRunId": "2ve2twrqyr0s",
                            "testCaseDefinitionId": "awr8pq5vc9yp",
                            "testCaseDefinitionName": "MQTT Connect",
                            "status": "PASS",
                            "startTime": "2022-11-12T00:01:53.693000-05:00",
                            "endTime": "2022-11-12T00:02:15.443000-05:00",
                            "logUrl": "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logEventViewer:group=/aws/iot/deviceadvisor/qqcsmtyyjabl;stream=nzlfyhaa18oa_2ve2twrqyr0s",
                            "warnings": "null",
                            "failure": "null"
                        }
                    ]
                }
            ]
        },
        "startTime": "2022-11-12T00:01:52.673000-05:00",
        "endTime": "2022-11-12T00:02:16.496000-05:00",
        "status": "PASS",
        "tags": {}
    }

For more information, see `Get a test suite run <https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-workflow.html#device-advisor-workflow-describe-suite>`__ in the *AWS IoT Core Developer Guide*.
