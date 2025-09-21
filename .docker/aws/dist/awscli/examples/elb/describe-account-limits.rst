**To describe your Classic Load Balancer limits**

The following ``describe-account-limits`` example displays details about the Classic Load Balancer limits for your AWS account. ::

    aws elb describe-account-limits

Output::

    {
        "Limits": [
            {
                "Name": "classic-load-balancers",
                "Max": "20"
            },
            {
                "Name": "classic-listeners",
                "Max": "100"
            },
            {
                "Name": "classic-registered-instances",
                "Max": "1000"
            }
        ]
    }
