**To deregister a patch group from a patch baseline**

The following ``deregister-patch-baseline-for-patch-group`` example deregisters the specified patch group from the specified patch baseline. ::

    aws ssm deregister-patch-baseline-for-patch-group \
        --patch-group "Production" \
        --baseline-id "pb-0ca44a362fEXAMPLE"

Output::

    {
      "PatchGroup":"Production",
      "BaselineId":"pb-0ca44a362fEXAMPLE"
    }

For more information, see `Add a Patch Group to a Patch Baseline  <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-group-patchbaseline.html>`__ in the *AWS Systems Manager User Guide*.