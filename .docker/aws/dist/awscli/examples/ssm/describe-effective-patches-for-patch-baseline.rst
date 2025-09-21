**Example 1: To get all patches defined by a custom patch baseline**

The following ``describe-effective-patches-for-patch-baseline`` example returns the patches defined by a custom patch baseline in the current AWS account. Note that for a custom baseline, only the ID is required for ``--baseline-id``. ::

    aws ssm describe-effective-patches-for-patch-baseline \
        --baseline-id "pb-08b654cf9b9681f04"

Output::

    {
        "EffectivePatches": [
            {
                "Patch": {
                    "Id": "fe6bd8c2-3752-4c8b-ab3e-1a7ed08767ba",
                    "ReleaseDate": 1544047205.0,
                    "Title": "2018-11 Update for Windows Server 2019 for x64-based Systems (KB4470788)",
                    "Description": "Install this update to resolve issues in Windows. For a complete listing of the issues that are included in this update, see the associated Microsoft Knowledge Base article for more information. After you install this item, you may have to restart your computer.",
                    "ContentUrl": "https://support.microsoft.com/en-us/kb/4470788",
                    "Vendor": "Microsoft",
                    "ProductFamily": "Windows",
                    "Product": "WindowsServer2019",
                    "Classification": "SecurityUpdates",
                    "MsrcSeverity": "Critical",
                    "KbNumber": "KB4470788",
                    "MsrcNumber": "",
                    "Language": "All"
                },
                "PatchStatus": {
                    "DeploymentStatus": "APPROVED",
                    "ComplianceLevel": "CRITICAL",
                    "ApprovalDate": 1544047205.0
                }
            },
            {
                "Patch": {
                    "Id": "915a6b1a-f556-4d83-8f50-b2e75a9a7e58",
                    "ReleaseDate": 1549994400.0,
                    "Title": "2019-02 Cumulative Update for .NET Framework 3.5 and 4.7.2 for Windows Server 2019 for x64 (KB4483452)",
                    "Description": "A security issue has been identified in a Microsoft software product that could affect your system. You can help protect your system by installing this update from Microsoft. For a complete listing of the issues that are included in this update, see the associated Microsoft Knowledge Base article. After you install this update, you may have to restart your system.",
                    "ContentUrl": "https://support.microsoft.com/en-us/kb/4483452",
                    "Vendor": "Microsoft",
                    "ProductFamily": "Windows",
                    "Product": "WindowsServer2019",
                    "Classification": "SecurityUpdates",
                    "MsrcSeverity": "Important",
                    "KbNumber": "KB4483452",
                    "MsrcNumber": "",
                    "Language": "All"
                },
                "PatchStatus": {
                    "DeploymentStatus": "APPROVED",
                    "ComplianceLevel": "CRITICAL",
                    "ApprovalDate": 1549994400.0
                }
            },
            ...
        ],
        "NextToken": "--token string truncated--"
    }

**Example 2: To get all patches defined by an AWS managed patch baseline**

The following ``describe-effective-patches-for-patch-baseline`` example returns the patches defined by an AWS managed patch baseline. Note that for an AWS managed baseline, the complete baseline ARN is required for ``--baseline-id`` ::

    aws ssm describe-effective-patches-for-patch-baseline \
        --baseline-id "arn:aws:ssm:us-east-2:733109147000:patchbaseline/pb-020d361a05defe4ed"
        
See example 1 for sample output.

For more information, see `How Security Patches Are Selected <https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-how-it-works-selection.html>`__ in the *AWS Systems Manager User Guide*.
