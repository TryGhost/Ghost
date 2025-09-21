**To update a user's phone configuration**

The following ``update-user-phone-config`` example updates the phone configuration for the specified user. ::

    aws connect update-user-phone-config \
        --phone-config PhoneType=SOFT_PHONE,AutoAccept=false,AfterContactWorkTimeLimit=60,DeskPhoneNumber=+18005551212 \
        --user-id 12345678-4444-3333-2222-111122223333 \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

This command produces no output.

For more information, see `Configure Agent Settings <https://docs.aws.amazon.com/connect/latest/adminguide/configure-agents.html>`__ in the *Amazon Connect Administrator Guide*.
