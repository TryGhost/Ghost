**To get information about your account limits**

The following command retrieves a list of regional limits for the current account. ::

    aws cloudformation describe-account-limits

Output::

    {
        "AccountLimits": [
            {
                "Name": "StackLimit",
                "Value": 200
            },
            {
                "Name": "StackOutputsLimit",
                "Value": 60
            },
            {
                "Name": "ConcurrentResourcesLimit",
                "Value": 2500
            }
        ]
    }
