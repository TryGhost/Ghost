**To list details for an audit finding**

The following ``describe-audit-finding`` example lists the details for the specified AWS IoT Device Defender audit finding. An audit can produce multiple findings. Use the ``list-audit-findings`` command to get a list of the findings from an audit to get the ``findingId``. :: 

    aws iot describe-audit-finding \
        --finding-id "ef4826b8-e55a-44b9-b460-5c485355371b"

Output::

    {
        "finding": {
            "findingId": "ef4826b8-e55a-44b9-b460-5c485355371b",
            "taskId": "873ed69c74a9ec8fa9b8e88e9abc4661",
            "checkName": "IOT_POLICY_OVERLY_PERMISSIVE_CHECK",
            "taskStartTime": 1576012045.745,
            "findingTime": 1576012046.168,
            "severity": "CRITICAL",
            "nonCompliantResource": {
                "resourceType": "IOT_POLICY",
                "resourceIdentifier": {
                    "policyVersionIdentifier": {
                        "policyName": "smp-ggrass-group_Core-policy",
                        "policyVersionId": "1"
                    }
                }
             },
            "reasonForNonCompliance": "Policy allows broad access to IoT data plane actions: [iot:Subscribe, iot:Connect, iot:GetThingShadow, iot:DeleteThingShadow, iot:UpdateThingShadow, iot:Publish].",
            "reasonForNonComplianceCode": "ALLOWS_BROAD_ACCESS_TO_IOT_DATA_PLANE_ACTIONS"
        }
    }   

For more information, see `Check Audit Results (Audit Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/AuditCommands.html#device-defender-AuditCommandsFindings>`__ in the *AWS IoT Developer Guide*.
