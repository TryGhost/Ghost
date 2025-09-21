**To list filters associated with the account that you used to activated Amazon Inspector**

The following ``list-filters`` examples lists filters associated with the account that you used to activated Amazon Inspector. ::

    aws inspector2 list-filters

Output::

    {
        "filters": [
            {
                "action": "SUPPRESS",
                "arn": "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444",
                "createdAt": "2024-05-15T21:11:08.602000+00:00",
                "criteria": {
                    "resourceType": [
                        {
                            "comparison": "EQUALS",
                            "value": "AWS_EC2_INSTANCE"
                        },
                    ]
                },
                "description": "This suppression rule omits EC2 instance type findings",
                "name": "ExampleSuppressionRuleEC2",
                "ownerId": "o-EXAMPLE222",
                "tags": {},
                "updatedAt": "2024-05-15T21:11:08.602000+00:00"
            },
            {
                "action": "SUPPRESS",
                "arn": "arn:aws:inspector2:us-east-1:813737243517:owner/o-EXAMPLE222/filter/EXAMPLE444444444",
                "createdAt": "2024-05-15T21:28:27.054000+00:00",
                "criteria": {
                    "resourceType": [
                        {
                            "comparison": "EQUALS",
                            "value": "AWS_ECR_INSTANCE"
                        }
                    ]   
                },
                "description": "This suppression rule omits ECR instance type findings",
                "name": "ExampleSuppressionRuleECR",
                "ownerId": "o-EXAMPLE222",
                "tags": {},
                "updatedAt": "2024-05-15T21:28:27.054000+00:00"
            }
        ]
    }

For more information, see `Filtering Amazon Inspector findings <https://docs.aws.amazon.com/inspector/latest/user/findings-managing-filtering.html>`__ in the *Amazon Inspector User Guide*.
