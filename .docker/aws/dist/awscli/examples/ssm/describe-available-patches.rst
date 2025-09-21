**To get available patches**

The following ``describe-available-patches`` example retrieves details about all available patches for Windows Server 2019 that have a MSRC severity of Critical. ::

    aws ssm describe-available-patches \
        --filters "Key=PRODUCT,Values=WindowsServer2019" "Key=MSRC_SEVERITY,Values=Critical"

Output::

    {
        "Patches": [
            {
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
            {
                "Id": "c96115e1-5587-4115-b851-22baa46a3f11",
                "ReleaseDate": 1549994410.0,
                "Title": "2019-02 Security Update for Adobe Flash Player for Windows Server 2019 for x64-based Systems (KB4487038)",
                "Description": "A security issue has been identified in a Microsoft software product that could affect your system. You can help protect your system by installing this update from Microsoft. For a complete listing of the issues that are included in this update, see the associated Microsoft Knowledge Base article. After you install this update, you may have to restart your system.",
                "ContentUrl": "https://support.microsoft.com/en-us/kb/4487038",
                "Vendor": "Microsoft",
                "ProductFamily": "Windows",
                "Product": "WindowsServer2019",
                "Classification": "SecurityUpdates",
                "MsrcSeverity": "Critical",
                "KbNumber": "KB4487038",
                "MsrcNumber": "",
                "Language": "All"
            },
            ...
        ]
    }

**To get details of a specific patch**

The following ``describe-available-patches`` example retrieves details about the specified patch. ::

    aws ssm describe-available-patches \
        --filters "Key=PATCH_ID,Values=KB4480979"

Output::

    {
        "Patches": [
            {
                "Id": "680861e3-fb75-432e-818e-d72e5f2be719",
                "ReleaseDate": 1546970408.0,
                "Title": "2019-01 Security Update for Adobe Flash Player for Windows Server 2016 for x64-based Systems (KB4480979)",
                "Description": "A security issue has been identified in a Microsoft software product that could affect your system. You can help protect your system by installing this update from Microsoft. For a complete listing of the issues that are included in this update, see the associated Microsoft Knowledge Base article. After you install this update, you may have to restart your system.",
                "ContentUrl": "https://support.microsoft.com/en-us/kb/4480979",
                "Vendor": "Microsoft",
                "ProductFamily": "Windows",
                "Product": "WindowsServer2016",
                "Classification": "SecurityUpdates",
                "MsrcSeverity": "Critical",
                "KbNumber": "KB4480979",
                "MsrcNumber": "",
                "Language": "All"
            }
        ]
    }

For more information, see `How Patch Manager Operations Work <https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-how-it-works.html>`__ in the *AWS Systems Manager User Guide*.
