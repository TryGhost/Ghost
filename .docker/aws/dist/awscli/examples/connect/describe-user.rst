**To display the details for a user**

The following ``describe-user`` example displays the details for the specified Amazon Connect user. ::

    aws connect describe-user \
        --user-id 0c245dc0-0cf5-4e37-800e-2a7481cc8a60
        --instance-id 40c83b68-ea62-414c-97bb-d018e39e158e

Output::

    {
        "User": {
            "Id": "0c245dc0-0cf5-4e37-800e-2a7481cc8a60",
            "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent/0c245dc0-0cf5-4e37-800e-2a7481cc8a60",
            "Username": "Jane",
            "IdentityInfo": {
                "FirstName": "Jane",
                "LastName": "Doe",
                "Email": "example.com"
            },
            "PhoneConfig": {
                "PhoneType": "SOFT_PHONE",
                "AutoAccept": false,
                "AfterContactWorkTimeLimit": 0,
                "DeskPhoneNumber": ""
            },
            "DirectoryUserId": "8b444cf6-b368-4f29-ba18-07af27405658",
            "SecurityProfileIds": [
                "b6f85a42-1dc5-443b-b621-de0abf70c9cf"
            ],
            "RoutingProfileId": "0be36ee9-2b5f-4ef4-bcf7-87738e5be0e5",
            "Tags": {}
        }
    }

For more information, see `Manage Users <https://docs.aws.amazon.com/connect/latest/adminguide/manage-users.html>`__ in the *Amazon Connect Administrator Guide*.
