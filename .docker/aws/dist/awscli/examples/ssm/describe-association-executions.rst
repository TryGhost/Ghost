**Example 1: To get details of all executions for an association**

The following ``describe-association-executions`` example describes all executions of the specified association. ::

    aws ssm describe-association-executions \
        --association-id "8dfe3659-4309-493a-8755-0123456789ab"

Output::

    {
        "AssociationExecutions": [
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "AssociationVersion": "1",
                "ExecutionId": "474925ef-1249-45a2-b93d-0123456789ab",
                "Status": "Success",
                "DetailedStatus": "Success",
                "CreatedTime": 1550505827.119,
                "ResourceCountByStatus": "{Success=1}"
            },
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "AssociationVersion": "1",
                "ExecutionId": "7abb6378-a4a5-4f10-8312-0123456789ab",
                "Status": "Success",
                "DetailedStatus": "Success",
                "CreatedTime": 1550505536.843,
                "ResourceCountByStatus": "{Success=1}"
            },
            ...
        ]
    }

For more information, see `Viewing association histories <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-state-assoc-history.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To get details of all executions for an association after a specific date and time**

The following ``describe-association-executions`` example describes all executions of an association after the specified date and time. ::

    aws ssm describe-association-executions \
        --association-id "8dfe3659-4309-493a-8755-0123456789ab" \
        --filters "Key=CreatedTime,Value=2019-02-18T16:00:00Z,Type=GREATER_THAN"

Output::

    {
        "AssociationExecutions": [
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "AssociationVersion": "1",
                "ExecutionId": "474925ef-1249-45a2-b93d-0123456789ab",
                "Status": "Success",
                "DetailedStatus": "Success",
                "CreatedTime": 1550505827.119,
                "ResourceCountByStatus": "{Success=1}"
            },
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "AssociationVersion": "1",
                "ExecutionId": "7abb6378-a4a5-4f10-8312-0123456789ab",
                "Status": "Success",
                "DetailedStatus": "Success",
                "CreatedTime": 1550505536.843,
                "ResourceCountByStatus": "{Success=1}"
            },
            ...
        ]
    }

For more information, see `Viewing association histories <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-state-assoc-history.html>`__ in the *AWS Systems Manager User Guide*.