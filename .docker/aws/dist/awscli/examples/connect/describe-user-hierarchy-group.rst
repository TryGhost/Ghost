**To display the details for a hierarchy group**

The following ``describe-user-hierarchy-group`` example displays the details for the specified Amazon Connect hierarchy group. ::

    aws connect describe-user-hierarchy-group \
        --hierarchy-group-id 12345678-1111-2222-800e-aaabbb555gg \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

   {
        "HierarchyGroup": {
            "Id": "12345678-1111-2222-800e-a2b3c4d5f6g7",
            "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent-group/12345678-1111-2222-800e-a2b3c4d5f6g7",
            "Name": "Example Corporation",
            "LevelId": "1",
            "HierarchyPath": {
                "LevelOne": {
                    "Id": "abcdefgh-3333-4444-8af3-201123456789",
                    "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent-group/abcdefgh-3333-4444-8af3-201123456789",
                    "Name": "Example Corporation"
                }
            }
        }
    }

For more information, see `Set Up Agent Hierarchies <https://docs.aws.amazon.com/connect/latest/adminguide/agent-hierarchy.html>`__ in the *Amazon Connect Administrator Guide*.


