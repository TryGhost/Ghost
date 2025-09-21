**To delete a detector, and disable GuardDuty, in the current region.**

This example shows how to delete a detector, if successful, this will disable GuardDuty in the region associated with that detector. ::

    aws guardduty delete-detector \
        --detector-id b6b992d6d2f48e64bc59180bfexample

This command produces no output.

For more information, see `Suspending or disabling GuardDuty <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_suspend-disable.html>`__ in the *GuardDuty User Guide*.