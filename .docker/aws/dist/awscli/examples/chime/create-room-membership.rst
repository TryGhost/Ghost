**To create a room membership**

The following ``create-room-membership`` example adds the specified user to the chat room as a chat room member. ::

    aws chime create-room-membership \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j \
        --member-id 1ab2345c-67de-8901-f23g-45h678901j2k

Output::

    {
        "RoomMembership": {
            "RoomId": "abcd1e2d-3e45-6789-01f2-3g45h67i890j",
            "Member": {
                "MemberId": "1ab2345c-67de-8901-f23g-45h678901j2k",
                "MemberType": "User",
                "Email": "janed@example.com",
                "FullName": "Jane Doe",
                "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45"
            },
            "Role": "Member",
            "InvitedBy": "arn:aws:iam::111122223333:user/alejandro",
            "UpdatedTimestamp": "2019-12-02T22:36:41.969Z"
        }
    }

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.