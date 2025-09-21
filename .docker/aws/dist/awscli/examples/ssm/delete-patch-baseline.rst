**To delete a patch baseline**

The following ``delete-patch-baseline`` example deletes the specified patch baseline. ::

    aws ssm delete-patch-baseline \
        --baseline-id "pb-045f10b4f382baeda"

Output::

    {
        "BaselineId": "pb-045f10b4f382baeda"
    }

For more information, see `Update or Delete a Patch Baseline (Console) <https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-baseline-update-or-delete.html>`__ in the *AWS Systems Manager User Guide*.
