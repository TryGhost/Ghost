**To remove a user as a member of a chat room**

The following ``delete-room-membership`` example removes the specified member from the specified chat room. ::

    aws chime delete-room-membership \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j \
        --member-id 1ab2345c-67de-8901-f23g-45h678901j2k

This command produces no output.

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.