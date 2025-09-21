**To set the default patch baseline**

The following ``register-default-patch-baseline`` example registers the specified custom patch baseline as the default patch baseline for the operating system type that it supports. ::

    aws ssm register-default-patch-baseline \
        --baseline-id "pb-abc123cf9bEXAMPLE"

Output::

    {
        "BaselineId":"pb-abc123cf9bEXAMPLE"
    }

The following ``register-default-patch-baseline`` example registers the default patch baseline provided by AWS for CentOS as the default patch baseline. ::

    aws ssm register-default-patch-baseline \
        --baseline-id "arn:aws:ssm:us-east-2:733109147000:patchbaseline/pb-0574b43a65ea646ed"

Output::

    {
        "BaselineId":"pb-abc123cf9bEXAMPLE"
    }

For more information, see `About Predefined and Custom Patch Baselines <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baselines.html>`__ in the *AWS Systems Manager User Guide*.
