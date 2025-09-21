**To associate tags with a Resolver resource**

The following ``tag-resource`` example associates two tag key/value pairs with the specified Resolver rule. ::

    aws route53resolver tag-resource \
        --resource-arn "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-42b60677c0example" \
        --tags "Key=my-key-1,Value=my-value-1" "Key=my-key-2,Value=my-value-2"

This command produces no output.

For information about using tags for cost allocation, see `Using Cost Allocation Tags <https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html>`__ in the *AWS Billing and Cost Management User Guide*.
