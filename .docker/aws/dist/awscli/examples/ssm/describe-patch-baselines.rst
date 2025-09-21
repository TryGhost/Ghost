**Example 1: To list all patch baselines**

The following ``describe-patch-baselines`` example retreives details for all patch baselines in your account in the current Region. ::

    aws ssm describe-patch-baselines

Output::

    {
        "BaselineIdentities": [
            {
                "BaselineName": "AWS-SuseDefaultPatchBaseline",
                "DefaultBaseline": true,
                "BaselineDescription": "Default Patch Baseline for Suse Provided by AWS.",
                "BaselineId": "arn:aws:ssm:us-east-2:733109147000:patchbaseline/pb-0123fdb36e334a3b2",
                "OperatingSystem": "SUSE"
            },
            {
                "BaselineName": "AWS-DefaultPatchBaseline",
                "DefaultBaseline": false,
                "BaselineDescription": "Default Patch Baseline Provided by AWS.",
                "BaselineId": "arn:aws:ssm:us-east-2:733109147000:patchbaseline/pb-020d361a05defe4ed",
                "OperatingSystem": "WINDOWS"
            },
            ...
            {
                "BaselineName": "MyWindowsPatchBaseline",
                "DefaultBaseline": true,
                "BaselineDescription": "My patch baseline for EC2 instances for Windows Server",
                "BaselineId": "pb-0ad00e0dd7EXAMPLE",
                "OperatingSystem": "WINDOWS"
            }
        ]
    }

**Example 2: To list all patch baselines provided by AWS**

The following ``describe-patch-baselines`` example lists all patch baselines provided by AWS. ::

    aws ssm describe-patch-baselines \
        --filters "Key=OWNER,Values=[AWS]"

**Example 3: To list all patch baselines that you own**

The following ``describe-patch-baselines`` example lists all custom patch baselines created in your account in the current Region. ::

    aws ssm describe-patch-baselines \
        --filters "Key=OWNER,Values=[Self]"

For more information, see `About Predefined and Custom Patch Baselines <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baselines.html>`__ in the *AWS Systems Manager User Guide*.
