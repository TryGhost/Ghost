**To list the active violations**

The following ``list-active-violations`` example lists all violations for the specified security profile. ::

    aws iot list-active-violations \
        --security-profile-name Testprofile

Output::

    {
        "activeViolations": [
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
                "lastViolationValue": {
                    "count": 0
                },
                "lastViolationTime": 1560293700.0,
                "violationStartTime": 1560279000.0
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
                "lastViolationValue": {
                    "count": 110
                },
                "lastViolationTime": 1560369000.0,
                "violationStartTime": 1560276600.0
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
                "lastViolationValue": {
                    "count": 0
                },
                "lastViolationTime": 1560276600.0,
                "violationStartTime": 1560276600.0
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
                "lastViolationValue": {
                    "count": 0
                },
                "lastViolationTime": 1560369000.0,
                "violationStartTime": 1560276600.0
            }
        ]
    }
