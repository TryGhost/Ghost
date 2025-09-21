**To create a user**

The following ``create-user`` example adds a user with the specified attributes to the specified Amazon Connect instance. ::

    aws connect create-user \
        --username Mary \
        --password Pass@Word1 \
        --identity-info FirstName=Mary,LastName=Major \
        --phone-config PhoneType=DESK_PHONE,AutoAccept=true,AfterContactWorkTimeLimit=60,DeskPhoneNumber=+15555551212 \
        --security-profile-id 12345678-1111-2222-aaaa-a1b2c3d4f5g7 \
        --routing-profile-id 87654321-9999-3434-abcd-x1y2z3a1b2c3 \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

    {
        "UserId": "87654321-2222-1234-1234-111234567891",
        "UserArn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent/87654321-2222-1234-1234-111234567891"
    }

For more information, see `Add Users <https://docs.aws.amazon.com/connect/latest/adminguide/user-management.html>`__ in the *Amazon Connect Administrator Guide*.
