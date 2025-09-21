**To update a filter**

The following ``update-filter`` example updates a filter to omit Lambda findings instead of ECR instance findings. ::

    aws inspector2 update-filter \
       --filter-arn "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444" \
       --name "ExampleSuppressionRuleLambda" \
       --description "This suppression rule omits Lambda instance findings" \
       --reason "Updating filter to omit Lambda instance findings instead of ECR instance findings"

Output::

    {
        "filters": [
            {
                "action": "SUPPRESS",
                "arn": "arn:aws:inspector2:us-west-2:123456789012:owner/o-EXAMPLE222/filter/EXAMPLE444444444",
                "createdAt": "2024-05-15T21:28:27.054000+00:00",
                "criteria": {
                    "resourceType": [
                        {
                            "comparison": "EQUALS",
                            "value": "AWS_ECR_INSTANCE"
                        }
                    ]
                },
                "description": "This suppression rule omits Lambda instance findings",
                "name": "ExampleSuppressionRuleLambda",
                "ownerId": "o-EXAMPLE222",
                "reason": "Updating filter to omit Lambda instance findings instead of ECR instance findings",
                "tags": {},
                "updatedAt": "2024-05-15T22:23:13.665000+00:00"
            }
        ]
    }

For more information, see `Managing findings in Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/findings-managing.html>`__ in the *Amazon Inspector User Guide*.