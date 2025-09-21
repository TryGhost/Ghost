**To list the security profile violations during a time period**

The following ``list-violation-events`` example lists violations that occurred between June 5, 2019 and June 12, 2019 for all AWS IoT Device Defender security profiles for the current AWS account and AWS Region. ::

    aws iot list-violation-events \
        --start-time 1559747125 \
        --end-time 1560351925

Output::

    {
        "violationEvents": [
            {
                "violationId": "174db59167fa474c80a652ad1583fd44",
                "thingName": "iotconsole-1560269126751-1",
                "securityProfileName": "Testprofile",
                "behavior": {
                    "name": "Authorization",
                    "metric": "aws:num-authorization-failures",
                    "criteria": {
                        "comparisonOperator": "greater-than",
                        "value": {
                            "count": 10
                        },
                        "durationSeconds": 300,
                        "consecutiveDatapointsToAlarm": 1,
                        "consecutiveDatapointsToClear": 1
                    }
                },
                "metricValue": {
                    "count": 0
                },
                "violationEventType": "in-alarm",
                "violationEventTime": 1560279000.0
            },
            {
                "violationId": "c8a9466a093d3b7b35cd44ca58bdbeab",
                "thingName": "TvnQoEoU",
                "securityProfileName": "Testprofile",
                "behavior": {
                    "name": "CellularBandwidth",
                    "metric": "aws:message-byte-size",
                    "criteria": {
                        "comparisonOperator": "greater-than",
                        "value": {
                            "count": 128
                        },
                        "consecutiveDatapointsToAlarm": 1,
                        "consecutiveDatapointsToClear": 1
                    }
                },
                "metricValue": {
                    "count": 110
                },
                "violationEventType": "in-alarm",
                "violationEventTime": 1560276600.0
            },
            {
                "violationId": "74aa393adea02e6648f3ac362beed55e",
                "thingName": "iotconsole-1560269232412-2",
                "securityProfileName": "Testprofile",
                "behavior": {
                    "name": "Authorization",
                    "metric": "aws:num-authorization-failures",
                    "criteria": {
                        "comparisonOperator": "greater-than",
                        "value": {
                            "count": 10
                        },
                        "durationSeconds": 300,
                        "consecutiveDatapointsToAlarm": 1,
                        "consecutiveDatapointsToClear": 1
                    }
                },
                "metricValue": {
                    "count": 0
                },
                "violationEventType": "in-alarm",
                "violationEventTime": 1560276600.0
            },
            {
                "violationId": "1e6ab5f7cf39a1466fcd154e1377e406",
                "thingName": "TvnQoEoU",
                "securityProfileName": "Testprofile",
                "behavior": {
                    "name": "Authorization",
                    "metric": "aws:num-authorization-failures",
                    "criteria": {
                        "comparisonOperator": "greater-than",
                        "value": {
                            "count": 10
                        },
                        "durationSeconds": 300,
                        "consecutiveDatapointsToAlarm": 1,
                        "consecutiveDatapointsToClear": 1
                    }
                },
                "metricValue": {
                    "count": 0
                },
                "violationEventType": "in-alarm",
                "violationEventTime": 1560276600.0
            }
        ]
    }

For more information, see `Detect Commands <https://docs.aws.amazon.com/iot/latest/developerguide/DetectCommands.html>`__ in the *AWS IoT Developer Guide*.
