**To list the security profiles in an instance**

The following ``list-security-profiles`` example lists the security profiles in the specified Amazon Connect instance. ::

    aws connect list-security-profiles \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

    {
        "SecurityProfileSummaryList": [
            {
                "Id": "12345678-1111-2222-800e-a2b3c4d5f6g7",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/security-profile/12345678-1111-2222-800e-a2b3c4d5f6g7",
                "Name": "CallCenterManager"
            },
            {
                "Id": "87654321-2222-3333-ac99-123456789102",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/security-profile/87654321-2222-3333-ac99-123456789102",
                "Name": "QualityAnalyst"
            },
            {
                "Id": "abcdefgh-3333-4444-8af3-201123456789",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/security-profile/abcdefgh-3333-4444-8af3-201123456789",
                "Name": "Agent"
            },
            {
                "Id": "12345678-1111-2222-800e-x2y3c4d5fzzzz",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/security-profile/12345678-1111-2222-800e-x2y3c4d5fzzzz",
                "Name": "Admin"
            }
        ]
    }

For more information, see `Assign Permissions: Security Profiles <https://docs.aws.amazon.com/connect/latest/adminguide/connect-security-profiles.html>`__ in the *Amazon Connect Administrator Guide*.
