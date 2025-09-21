**To list the user hierarchy groups in an instance**

The following ``list-user-hierarchy-groups`` example lists the user hierarchy groups in the specified Amazon Connect instance. ::

    aws connect list-user-hierarchy-groups \
        --instance-id 40c83b68-ea62-414c-97bb-d018e39e158e 

Output::

    {
        "UserHierarchyGroupSummaryList": [
            {
                "Id": "0e2f6d1d-b3ca-494b-8dbc-ba81d9f8182a",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/agent-group/0e2f6d1d-b3ca-494b-8dbc-ba81d9f8182a",
                "Name": "Example Corporation"
            },
        ]
    }

For more information, see `Set Up Agent Hierarchies <https://docs.aws.amazon.com/connect/latest/adminguide/agent-hierarchy.html>`__ in the *Amazon Connect Administrator Guide*.
