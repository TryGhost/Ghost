**To create multiple room memberships**

The following ``batch-create-room-membership`` example adds multiple users to a chat room as chat room members. It also assigns administrator and member roles to the users. ::

    aws chime batch-create-room-membership \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --room-id abcd1e2d-3e45-6789-01f2-3g45h67i890j \
        --membership-item-list "MemberId=1ab2345c-67de-8901-f23g-45h678901j2k,Role=Administrator" "MemberId=2ab2345c-67de-8901-f23g-45h678901j2k,Role=Member"

Output::

    {
        "ResponseMetadata": {
            "RequestId": "169ba401-d886-475f-8b3f-e01eac6fadfb",
            "HTTPStatusCode": 201,
            "HTTPHeaders": {
                "x-amzn-requestid": "169ba401-d886-475f-8b3f-e01eac6fadfb",
                "content-type": "application/json",
                "content-length": "13",
                "date": "Mon, 02 Dec 2019 22:46:58 GMT",
                "connection": "keep-alive"
            },
            "RetryAttempts": 0
        },
        "Errors": []
    }

For more information, see `Creating a Chat Room <https://docs.aws.amazon.com/chime/latest/ug/chime-chat-room.html>`__ in the *Amazon Chime User Guide*.