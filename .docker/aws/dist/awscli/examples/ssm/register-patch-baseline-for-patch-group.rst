**To register a patch baseline for a patch group**

The following ``register-patch-baseline-for-patch-group`` example registers a patch baseline for a patch group. ::

    aws ssm register-patch-baseline-for-patch-group \
        --baseline-id "pb-045f10b4f382baeda" \
        --patch-group "Production"

Output::

    {
        "BaselineId": "pb-045f10b4f382baeda",
        "PatchGroup": "Production"
    }

For more information, see `Create a Patch Group` <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-tagging.html>__ and `Add a Patch Group to a Patch Baseline <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-patchbaseline.html>`__ in the *AWS Systems Manager User Guide*.
