**To display the details for a hierarchy structure**

The following ``describe-user-hierarchy-structure`` example displays the details for the hierarchy structure for the specified Amazon Connect instance. ::

    aws connect describe-user-hierarchy-group \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

   {
        "HierarchyStructure": {
            "LevelOne": {
                "Id": "12345678-1111-2222-800e-aaabbb555gg",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent-group-level/1",
                "Name": "Corporation"
            },
            "LevelTwo": {
                "Id": "87654321-2222-3333-ac99-123456789102",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent-group-level/2",
                "Name": "Services Division"
            },
            "LevelThree": {
                "Id": "abcdefgh-3333-4444-8af3-201123456789",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/agent-group-level/3",
                "Name": "EU Site"
            }    
        }
    }
    
For more information, see `Set Up Agent Hierarchies <https://docs.aws.amazon.com/connect/latest/adminguide/agent-hierarchy.html>`__ in the *Amazon Connect Administrator Guide*.
