**To update a user's hierarchy**

The following ``update-user-hierarchy`` example updates the agent hierarchy for the specified Amazon Connect user. ::

    aws connect update-user-hierarchy \
        --hierarchy-group-id 12345678-a1b2-c3d4-e5f6-123456789abc \
        --user-id 87654321-2222-1234-1234-111234567891 \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

This command produces no output.

For more information, see `Configure Agent Settings <https://docs.aws.amazon.com/connect/latest/adminguide/configure-agents.html>`__ in the *Amazon Connect Administrator Guide*.
