**To display the patch baseline for a patch group**

The following ``get-patch-baseline-for-patch-group`` example retrieves details about the patch baseline for the specified patch group. ::

    aws ssm get-patch-baseline-for-patch-group \
        --patch-group "DEV"

Output::

    {
        "PatchGroup": "DEV",
        "BaselineId": "pb-0123456789abcdef0",
        "OperatingSystem": "WINDOWS"
    }

For more information, see `Create a Patch Group` <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-tagging.html>__ and `Add a Patch Group to a Patch Baseline <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-patchbaseline.html>`__ in the *AWS Systems Manager User Guide*.
