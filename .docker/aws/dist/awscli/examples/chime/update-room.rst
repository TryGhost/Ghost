**To update a chat room**

The following ``update-room`` example  modifies the name of the specified chat room. ::

    aws chime update-room \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j \
        --name teamRoom

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