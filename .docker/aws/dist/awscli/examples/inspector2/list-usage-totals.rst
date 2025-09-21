**To list usage totals over the last 30 days**

The following ``list-usage-totals`` examples lists usage totals over the last 30 days. ::

    aws inspector2 list-usage-totals

Output::

    {
        "totals": [
            {
                "accountId": "123456789012",
                "usage": [
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 4.6022044647,
                        "total": 1893.4784083333334,
                        "type": "EC2_AGENTLESS_INSTANCE_HOURS"
                    },
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 18.892449279,
                        "total": 10882.050784722222,
                        "type": "EC2_INSTANCE_HOURS"
                    },
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 5.4525363736,
                        "total": 6543.043648333333,
                        "type": "LAMBDA_FUNCTION_CODE_HOURS"
                    },
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 3.9064080309,
                        "total": 9375.379274166668,
                        "type": "LAMBDA_FUNCTION_HOURS"
                    },
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 0.06,
                        "total": 6.0,
                        "type": "ECR_RESCAN"
                    },
                    {
                        "currency": "USD",
                        "estimatedMonthlyCost": 0.09,
                        "total": 1.0,
                        "type": "ECR_INITIAL_SCAN"
                    }
                ]
            }
        ]
    }

For more information, see `Monitoring usage and cost in Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/usage.html>`__ in the *Amazon Inspector User Guide*.