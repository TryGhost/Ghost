**To update a room membership**

The following ``update-room-membership`` example modifies the role of the specified chat room member to ``Administrator``. ::

    aws chime update-room-membership \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j \
        --member-id 1ab2345c-67de-8901-f23g-45h678901j2k \
        --role Administrator

Output::

    {
        "RoomMembership": {
            "RoomId": "abcd1e2d-3e45-6789-01f2-3g45h67i890j",
            "Member": {
                "MemberId": "1ab2345c-67de-8901-f23g-45h678901j2k",
                "MemberType": "User",
                "Email": "sofiamartinez@example.com",
                "FullName": "Sofia Martinez",
                "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45"
            },
            "Role": "Administrator",
            "InvitedBy": "arn:aws:iam::111122223333:user/admin",
            "UpdatedTimestamp": "2019-12-02T22:40:22.931Z"
        }
    }

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.