**To add tags to an existing resource**

The following ``tag-resource`` example add tags to an existing subscriber resource. To create a new resource and add one or more tags to it, don't use this operation. Instead, use the appropriate Create operation for the the type of resource that you want to create. ::

    aws securitylake tag-resource \
        --resource-arn "arn:aws:securitylake:us-east-1:123456789012:subscriber/1234abcd-12ab-34cd-56ef-1234567890ab" \
        --tags key=Environment,value=Cloud

This command produces no output.

For more information, see `Tagging Amazon Security Lake resources <https://docs.aws.amazon.com/security-lake/latest/userguide/tagging-resources.html#tags-retrieve>`__ in the *Amazon Security Lake User Guide*.
