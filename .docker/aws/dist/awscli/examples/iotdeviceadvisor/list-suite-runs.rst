**Example 1: To list all information about the specified IoT Device Advisor test suite runs status**

The following ``list-suite-runs`` example lists all information about a device advisor test suite runs status with the specified suite definition ID. If you have more than 25 test suite runs, the "nextToken" will be shown in the output. You can use this "nextToken" to show the rest of the test suite runs. ::

    aws iotdeviceadvisor list-suite-runs \
        --suite-definition-id ztvb5aew4w4x

Output::

    {
        "suiteRunsList": [
            {
                "suiteDefinitionId": "ztvb5aew4w4x",
                "suiteDefinitionVersion": "v1",
                "suiteDefinitionName": "TestSuite",
                "suiteRunId": "p6awv89nre6v",
                "createdAt": "2022-12-01T16:33:14.212000-05:00",
                "startedAt": "2022-12-01T16:33:15.710000-05:00",
                "endAt": "2022-12-01T16:42:03.323000-05:00",
                "status": "PASS",
                "passed": 6,
                "failed": 0
            }
        ]
    }

**Example 2: To list information about the specified IoT Device Advisor test suite runs status with the specified settings**

The following ``list-suite-runs`` example lists information about a device advisor test suite runs status with the specified suite definition ID and the specified max-result number. If you have more test suite runs than the max number, the "nextToken" will be shown in the output. If you have "nextToken", you can use "nextToken" to show the test suite runs that weren't shown before. ::

    aws iotdeviceadvisor list-suite-runs \
        --suite-definition-id qqcsmtyyjaml \
        --max-result 1 \
        --next-token "nextTokenValue"

Output::

    {
        "suiteRunsList": [
            {
                "suiteDefinitionId": "qqcsmtyyjaml",
                "suiteDefinitionVersion": "v1",
                "suiteDefinitionName": "MQTT connection",
                "suiteRunId": "gz9vm2s6d2jy",
                "createdAt": "2022-12-01T20:10:27.079000-05:00",
                "startedAt": "2022-12-01T20:10:28.003000-05:00",
                "endAt": "2022-12-01T20:10:45.084000-05:00",
                "status": "STOPPED",
                "passed": 0,
                "failed": 0
            }
        ],
        "nextToken": "nextTokenValue"
    }

For more information, see `ListSuiteRuns <https://docs.aws.amazon.com/iot/latest/apireference/API_iotdeviceadvisor_ListSuiteRuns.html>`__ in the *AWS IoT API Reference*.
