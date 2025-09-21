**To list chat rooms**

The following ``list-rooms`` example displays a list of chat rooms in the specified account. The list is filtered to only those chat rooms that the specified member belongs to. ::

    aws chime list-rooms \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --member-id 1ab2345c-67de-8901-f23g-45h678901j2k

Output::

    {
        "Room": {
            "RoomId": "abcd1e2d-3e45-6789-01f2-3g45h67i890j",
            "Name": "teamRoom",
            "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45",
            "CreatedBy": "arn:aws:iam::111122223333:user/alejandro",
            "CreatedTimestamp": "2019-12-02T22:29:31.549Z",
            "UpdatedTimestamp": "2019-12-02T22:33:19.310Z"
        }
    }

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.