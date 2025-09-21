**To update a user's security profiles**

The following ``update-user-security-profiles`` example updates the security profile for the specified Amazon Connect user. ::

    aws connect update-user-security-profiles \
        --security-profile-ids 12345678-1234-1234-1234-1234567892111 \
        --user-id 87654321-2222-1234-1234-111234567891 \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

This command produces no output.
    
For more information, see `Assign Permissions: Security Profiles <https://docs.aws.amazon.com/connect/latest/adminguide/connect-security-profiles.html>`__ in the *Amazon Connect Administrator Guide*.
