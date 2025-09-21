**To run an association immediately and only one time**

The following ``start-associations-once`` example run the specified association immediately and only once. There is no output if the command succeeds. ::

    aws ssm start-associations-once \
        --association-id "8dfe3659-4309-493a-8755-0123456789ab"

This command produces no output.

For more information, see `Viewing association histories <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-state-assoc-history.html>`__ in the *AWS Systems Manager User Guide*.