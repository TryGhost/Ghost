**To list the user hierarchy groups in an instance**

The following ``list-users`` example lists the users in the specified Amazon Connect instance. ::

    aws connect list-users \
        --instance-id 40c83b68-ea62-414c-97bb-d018e39e158e 

Output::

    {
        "UserSummaryList": [
            {
                "Id": "0c245dc0-0cf5-4e37-800e-2a7481cc8a60",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent/0c245dc0-0cf5-4e37-800e-2a7481cc8a60",
                "Username": "Jane"
            },
            {
                "Id": "46f0c67c-3fc7-4806-ac99-403798788c14",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent/46f0c67c-3fc7-4806-ac99-403798788c14",
                "Username": "Paulo"
            },
            {
                "Id": "55a83578-95e1-4710-8af3-2b7afe310e48",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent/55a83578-95e1-4710-8af3-2b7afe310e48",
                "Username": "JohnD"
            },
            {
                "Id": "703e27b5-c9f0-4f1f-a239-64ccbb160125",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent/703e27b5-c9f0-4f1f-a239-64ccbb160125",
                "Username": "JohnS"
            }
        ]
    }

For more information, see `Add Users <https://docs.aws.amazon.com/connect/latest/adminguide/user-management.html>`__ in the *Amazon Connect Administrator Guide*.
