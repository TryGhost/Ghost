**To list the available severity levels**

The following ``describe-severity-levels`` example lists the available severity levels for a support case. ::

    aws support describe-severity-levels

Output::
  
    {
        "severityLevels": [
            {
                "code": "low",
                "name": "Low"
            },
            {
                "code": "normal",
                "name": "Normal"
            },
            {
                "code": "high",
                "name": "High"
            },
            {
                "code": "urgent",
                "name": "Urgent"
            },
            {
                "code": "critical",
                "name": "Critical"
            }
        ]
    }

For more information, see `Choosing a severity <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html#choosing-severity>`__ in the *AWS Support User Guide*.
