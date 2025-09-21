**Example 1: To cancel a command for all instances**

The following ``cancel-command`` example attempts to cancel the specified command that is already running for all instances. ::

    aws ssm cancel-command \
        --command-id "662add3d-5831-4a10-b64a-f2ff3EXAMPLE"

This command produces no output.

**Example 2: To cancel a command for specific instances**

The following ``cancel-command`` example attempts to cancel a command for the specified instance only. ::

    aws ssm cancel-command \
        --command-id "662add3d-5831-4a10-b64a-f2ff3EXAMPLE"
        --instance-ids "i-02573cafcfEXAMPLE"

This command produces no output.

For more information, see `Tagging Systems Manager Parameters <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-tag.html>`__ in the *AWS Systems Manager User Guide*.
