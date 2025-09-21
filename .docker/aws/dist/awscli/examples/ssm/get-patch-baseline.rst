**To display a patch baseline**

The following ``get-patch-baseline`` example retrieves the details for the specified patch baseline. ::

    aws ssm get-patch-baseline \
        --baseline-id "pb-0123456789abcdef0"

Output::

    {
        "BaselineId": "pb-0123456789abcdef0",
        "Name": "WindowsPatching",
        "OperatingSystem": "WINDOWS",
        "GlobalFilters": {
            "PatchFilters": []
        },
        "ApprovalRules": {
            "PatchRules": [
                {
                    "PatchFilterGroup": {
                        "PatchFilters": [
                            {
                                "Key": "PRODUCT",
                                "Values": [
                                    "WindowsServer2016"
                                ]
                            }
                        ]
                    },
                    "ComplianceLevel": "CRITICAL",
                    "ApproveAfterDays": 0,
                    "EnableNonSecurity": false
                }
            ]
        },
        "ApprovedPatches": [],
        "ApprovedPatchesComplianceLevel": "UNSPECIFIED",
        "ApprovedPatchesEnableNonSecurity": false,
        "RejectedPatches": [],
        "RejectedPatchesAction": "ALLOW_AS_DEPENDENCY",
        "PatchGroups": [
            "QA",
            "DEV"
        ],
        "CreatedDate": 1550244180.465,
        "ModifiedDate": 1550244180.465,
        "Description": "Patches for Windows Servers",
        "Sources": []
    }

For more information, see `About Patch Baselines <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-baselines.html>`__ in the *AWS Systems Manager User Guide*.
