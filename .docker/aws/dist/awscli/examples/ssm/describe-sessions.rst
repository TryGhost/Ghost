**Example 1: To list all active Session Manager sessions**

This ``describe-sessions`` example retrieves a list of the active sessions created most recently (both connected and disconnected sessions) over the past 30 days that were started by the specified user. This command returns only results for connections to targets initiated using Session Manager. It does not list connections made through other means, such as Remote Desktop Connections or SSH. ::

    aws ssm describe-sessions \
        --state "Active" \
        --filters "key=Owner,value=arn:aws:sts::123456789012:assumed-role/Administrator/Shirley-Rodriguez"

Output::

    {
        "Sessions": [
            {
                "SessionId": "John-07a16060613c408b5",
                "Target": "i-1234567890abcdef0",
                "Status": "Connected",
                "StartDate": 1550676938.352,
                "Owner": "arn:aws:sts::123456789012:assumed-role/Administrator/Shirley-Rodriguez",
                "OutputUrl": {}
            },
            {
                "SessionId": "John-01edf534b8b56e8eb",
                "Target": "i-9876543210abcdef0",
                "Status": "Connected",
                "StartDate": 1550676842.194,
                "Owner": "arn:aws:sts::123456789012:assumed-role/Administrator/Shirley-Rodriguez",
                "OutputUrl": {}
            }
        ]
    }

**Example 2: To list all terminated Session Manager sessions**

This ``describe-sessions`` example retrieves a list of the most recently terminated sessions from the past 30 days for all users. ::

    aws ssm describe-sessions \
        --state "History"

Output::

    {
        "Sessions": [
            {
                "SessionId": "Mary-Major-0022b1eb2b0d9e3bd",
                "Target": "i-1234567890abcdef0",
                "Status": "Terminated",
                "StartDate": 1550520701.256,
                "EndDate": 1550521931.563,
                "Owner": "arn:aws:sts::123456789012:assumed-role/Administrator/Mary-Major"
            },
            {
                "SessionId": "Jane-Roe-0db53f487931ed9d4",
                "Target": "i-9876543210abcdef0",
                "Status": "Terminated",
                "StartDate": 1550161369.149,
                "EndDate": 1550162580.329,
                "Owner": "arn:aws:sts::123456789012:assumed-role/Administrator/Jane-Roe"
            },
            ...
        ],
        "NextToken": "--token string truncated--"
    }

For more information, see `View Session History <https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-view-history.html>`__ in the *AWS Systems Manager User Guide*.