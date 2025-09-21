**To list room memberships**

The following ``list-room-memberships`` example displays a list of the membership details for the specified chat room. ::

    aws chime list-room-memberships \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j

Output::

    {
        "RoomMemberships": [
            {
                "RoomId": "abcd1e2d-3e45-6789-01f2-3g45h67i890j",
                "Member": {
                    "MemberId": "2ab2345c-67de-8901-f23g-45h678901j2k",
                    "MemberType": "User",
                    "Email": "zhangw@example.com",
                    "FullName": "Zhang Wei",
                    "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45"
                },
                "Role": "Member",
                "InvitedBy": "arn:aws:iam::111122223333:user/alejandro",
                "UpdatedTimestamp": "2019-12-02T22:46:58.532Z"
            },
            {
                "RoomId": "abcd1e2d-3e45-6789-01f2-3g45h67i890j",
                "Member": {
                    "MemberId": "1ab2345c-67de-8901-f23g-45h678901j2k",
                    "MemberType": "User",
                    "Email": "janed@example.com",
                    "FullName": "Jane Doe",
                    "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45"
                },
                "Role": "Administrator",
                "InvitedBy": "arn:aws:iam::111122223333:user/alejandro",
                "UpdatedTimestamp": "2019-12-02T22:46:58.532Z"
            }
        ]
    }

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.