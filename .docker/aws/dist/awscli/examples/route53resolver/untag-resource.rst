**To remove tags from a Resolver resource**

The following ``untag-resource`` example removes two tags from the specified Resolver rule. ::

    aws route53resolver untag-resource \
        --resource-arn "arn:aws:route53resolver:us-west-2:111122223333:resolver-rule/rslvr-rr-42b60677c0example" \
        --tag-keys my-key-1 my-key-2

This command produces no output. To confirm that the tags were removed, you can use `list-tags-for-resource <https://docs.aws.amazon.com/cli/latest/reference/route53resolver/list-tags-for-resource.html>`__.

For information about using tags for cost allocation, see `Using Cost Allocation Tags <https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html>`__ in the *AWS Billing and Cost Management User Guide*.
