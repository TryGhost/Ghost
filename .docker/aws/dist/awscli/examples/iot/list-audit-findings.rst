**Example 1: To list all findings from an audit**

The following ``list-audit-findings`` example lists all findings from an AWS IoT Device Defender audit with a specified task ID. ::

    aws iot list-audit-findings \
        --task-id a3aea009955e501a31b764abe1bebd3d

Output::

    {
        "findings": []
    }

**Example 2: To list findings for an audit check type**

The following ``list-audit-findings`` example shows findings from AWS IoT Device Defender audits that ran between June 5, 2019 and June 19, 2019 in which devices are sharing a device certificate. When you specify a check name, you must provide a start and end time. ::

    aws iot list-audit-findings \
        --check-name DEVICE_CERTIFICATE_SHARED_CHECK \
        --start-time 1559747125 \
        --end-time 1560962028

Output::

    {
        "findings": [
            {
                "taskId": "eeef61068b0eb03c456d746c5a26ee04",
                "checkName": "DEVICE_CERTIFICATE_SHARED_CHECK",
                "taskStartTime": 1560161017.172,
                "findingTime": 1560161017.592,
                "severity": "CRITICAL",
                "nonCompliantResource": {
                    "resourceType": "DEVICE_CERTIFICATE",
                    "resourceIdentifier": {
                        "deviceCertificateId": "b193ab7162c0fadca83246d24fa090300a1236fe58137e121b011804d8ac1d6b"
                    }
                },
                "relatedResources": [
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "ZipxgAIl"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1560086374068"
                        }
                    },
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "ZipxgAIl"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1560081552187",
                            "DISCONNECTION_TIME": "1560086371552"
                        }
                    },
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "ZipxgAIl"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1559289863631",
                            "DISCONNECTION_TIME": "1560081532716"
                        }
                    }
                ],
                "reasonForNonCompliance": "Certificate shared by one or more devices.",
                "reasonForNonComplianceCode": "CERTIFICATE_SHARED_BY_MULTIPLE_DEVICES"
            },
            {
                "taskId": "bade6b5efd2e1b1569822f6021b39cf5",
                "checkName": "DEVICE_CERTIFICATE_SHARED_CHECK",
                "taskStartTime": 1559988217.27,
                "findingTime": 1559988217.655,
                "severity": "CRITICAL",
                "nonCompliantResource": {
                    "resourceType": "DEVICE_CERTIFICATE",
                    "resourceIdentifier": {
                        "deviceCertificateId": "b193ab7162c0fadca83246d24fa090300a1236fe58137e121b011804d8ac1d6b"
                    }
                },
                "relatedResources": [
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "xShGENLW"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1559972350825"
                        }
                    },
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "xShGENLW"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1559255062002",
                            "DISCONNECTION_TIME": "1559972350616"
                        }
                    }
                ],
                "reasonForNonCompliance": "Certificate shared by one or more devices.",
                "reasonForNonComplianceCode": "CERTIFICATE_SHARED_BY_MULTIPLE_DEVICES"
            },
            {
                "taskId": "c23f6233ba2d35879c4bb2810fb5ffd6",
                "checkName": "DEVICE_CERTIFICATE_SHARED_CHECK",
                "taskStartTime": 1559901817.31,
                "findingTime": 1559901817.767,
                "severity": "CRITICAL",
                "nonCompliantResource": {
                    "resourceType": "DEVICE_CERTIFICATE",
                    "resourceIdentifier": {
                        "deviceCertificateId": "b193ab7162c0fadca83246d24fa090300a1236fe58137e121b011804d8ac1d6b"
                    }
                },
                "relatedResources": [
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "TvnQoEoU"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1559826729768"
                        }
                    },
                    {
                        "resourceType": "CLIENT_ID",
                        "resourceIdentifier": {
                            "clientId": "TvnQoEoU"
                        },
                        "additionalInfo": {
                            "CONNECTION_TIME": "1559345920964",
                            "DISCONNECTION_TIME": "1559826728402"
                        }
                    }
                ],
                "reasonForNonCompliance": "Certificate shared by one or more devices.",
                "reasonForNonComplianceCode": "CERTIFICATE_SHARED_BY_MULTIPLE_DEVICES"
            }
        ]
    }

For more information, see `Audit Commands <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html>`__ in the *AWS IoT Developer Guide*.

