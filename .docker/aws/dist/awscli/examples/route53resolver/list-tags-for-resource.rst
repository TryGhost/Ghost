**To list the tags for a Resolver resource**

The following ``list-tags-for-resource`` example lists the tags that are assigned to the specified Resolver rule. ::

    aws route53resolver list-tags-for-resource \
        --resource-arn "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-42b60677c0example"

Output::

    {
        "Tags": [
            {
                "Key": "my-key-1",
                "Value": "my-value-1"
            },
            {
                "Key": "my-key-2",
                "Value": "my-value-2"
            }
        ]
    }

For information about using tags for cost allocation, see `Using Cost Allocation Tags <https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html>`__ in the *AWS Billing and Cost Management User Guide*.
