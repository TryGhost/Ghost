**Example 1: To get the patch state details for an instance**

The following ``describe-instance-patches`` example retrieves details about the patches for the specified instance. ::

    aws ssm describe-instance-patches \
        --instance-id "i-1234567890abcdef0"

Output::

    {
        "Patches": [
            {
                "Title": "2019-01 Security Update for Adobe Flash Player for Windows Server 2016 for x64-based Systems (KB4480979)",
                "KBId": "KB4480979",
                "Classification": "SecurityUpdates",
                "Severity": "Critical",
                "State": "Installed",
                "InstalledTime": "2019-01-09T00:00:00+00:00"
            },
            {
                "Title": "",
                "KBId": "KB4481031",
                "Classification": "",
                "Severity": "",
                "State": "InstalledOther",
                "InstalledTime": "2019-02-08T00:00:00+00:00"
            },
            ...
        ],
        "NextToken": "--token string truncated--"
    }

**Example 2: To get a list of patches in the Missing state for an instance**

The following ``describe-instance-patches`` example retrieves information about patches that are in the Missing state for the specified instance. ::

    aws ssm describe-instance-patches \
        --instance-id "i-1234567890abcdef0" \
        --filters Key=State,Values=Missing

Output::

    {
        "Patches": [
            {
                "Title": "Windows Malicious Software Removal Tool x64 - February 2019 (KB890830)",
                "KBId": "KB890830",
                "Classification": "UpdateRollups",
                "Severity": "Unspecified",
                "State": "Missing",
                "InstalledTime": "1970-01-01T00:00:00+00:00"
            },
            ...
        ],
        "NextToken": "--token string truncated--"
    }

For more information, see `About Patch Compliance States <https://docs.aws.amazon.com/systems-manager/latest/userguide/about-patch-compliance-states.html>`__ in the *AWS Systems Manager User Guide*.

**Example 3: To get a list of patches installed since a specified InstalledTime for an instance**

The following ``describe-instance-patches`` example retrieves information about patches installed since a specified time for the specified instance by combining the use of ``--filters`` and ``--query``. ::

    aws ssm describe-instance-patches \
        --instance-id "i-1234567890abcdef0" \
        --filters Key=State,Values=Installed \
        --query "Patches[?InstalledTime >= `2023-01-01T16:00:00`]"

Output::

    {
        "Patches": [
            {
                "Title": "2023-03 Cumulative Update for Windows Server 2019 (1809) for x64-based Systems (KB5023702)",
                "KBId": "KB5023702",
                "Classification": "SecurityUpdates",
                "Severity": "Critical",
                "State": "Installed",
                "InstalledTime": "2023-03-16T11:00:00+00:00"
            },
            ...
        ],
        "NextToken": "--token string truncated--"
    }