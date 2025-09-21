**To list Trusted Advisor checks**

The following ``list-checks`` example lists all Trusted Advisor checks. ::

    aws trustedadvisor list-checks

Output::

    {
        "checkSummaries": [
            {
                "arn": "arn:aws:trustedadvisor:::check/1iG5NDGVre",
                "awsServices": [
                    "EC2"
                ],
                "description": "Checks security groups for rules that allow unrestricted access to a resource. Unrestricted access increases opportunities for malicious activity (hacking, denial-of-service attacks, loss of data)",
                "id": "1iG5NDGVre",
                "metadata": {
                    "0": "Region",
                    "1": "Security Group Name",
                    "2": "Security Group ID",
                    "3": "Protocol",
                    "4": "Port",
                    "5": "Status",
                    "6": "IP Range"
                },
                "name": "Security Groups - Unrestricted Access",
                "pillars": [
                    "security"
                ],
                "source": "ta_check"
            },
            {
                "arn": "arn:aws:trustedadvisor:::check/1qazXsw23e",
                "awsServices": [
                    "RDS"
                ],
                "description": "Checks your usage of RDS and provides recommendations on purchase of Reserved Instances to help reduce costs incurred from using RDS On-Demand. AWS generates these recommendations by analyzing your On-Demand usage for the past 30 days. We then simulate every combination of reservations in the generated category of usage in order to identify the best number of each type of Reserved Instance to purchase to maximize your savings. This check covers recommendations based on partial upfront payment option with 1-year or 3-year commitment. This check is not available to accounts linked in Consolidated Billing. Recommendations are only available for the Paying Account.",
                "id": "1qazXsw23e",
                "metadata": {
                    "0": "Region",
                    "1": "Family",
                    "2": "Instance Type",
                    "3": "License Model",
                    "4": "Database Edition",
                    "5": "Database Engine",
                    "6": "Deployment Option",
                    "7": "Recommended number of Reserved Instances to purchase",
                    "8": "Expected Average Reserved Instance Utilization",
                    "9": "Estimated Savings with Recommendation (monthly)"
                    "10": "Upfront Cost of Reserved Instances",
                    "11": "Estimated cost of Reserved Instances (monthly)",
                    "12": "Estimated On-Demand Cost Post Recommended Reserved Instance Purchase (monthly)",
                    "13": "Estimated Break Even (months)",
                    "14": "Lookback Period (days)",
                    "15": "Term (years)"
                },
                "name": "Amazon Relational Database Service (RDS) Reserved Instance Optimization",
                "pillars": [
                    "cost_optimizing"
                ],
                "source": "ta_check"
            },
            {
                "arn": "arn:aws:trustedadvisor:::check/1qw23er45t",
                "awsServices": [
                    "Redshift"
                ],
                "description": "Checks your usage of Redshift and provides recommendations on purchase of Reserved Nodes to help reduce costs incurred from using Redshift On-Demand. AWS generates these recommendations by analyzing your On-Demand usage for the past 30 days. We then simulate every combination of reservations in the generated category of usage in order to identify the best number of each type of Reserved Nodes to purchase to maximize your savings. This check covers recommendations based on partial upfront payment option with 1-year or 3-year commitment. This check is not available to accounts linked in Consolidated Billing. Recommendations are only available for the Paying Account.",
                "id": "1qw23er45t",
                "metadata": {
                    "0": "Region",
                    "1": "Family",
                    "2": "Node Type",
                    "3": "Recommended number of Reserved Nodes to purchase",
                    "4": "Expected Average Reserved Node Utilization",
                    "5": "Estimated Savings with Recommendation (monthly)",
                    "6": "Upfront Cost of Reserved Nodes",
                    "7": "Estimated cost of Reserved Nodes (monthly)",
                    "8": "Estimated On-Demand Cost Post Recommended Reserved Nodes Purchase (monthly)",
                    "9": "Estimated Break Even (months)",
                    "10": "Lookback Period (days)",
                    "11": "Term (years)",
                },
                "name": "Amazon Redshift Reserved Node Optimization",
                "pillars": [
                    "cost_optimizing"
                ],
                "source": "ta_check"
            },
        ],
        "nextToken": "REDACTED"
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.