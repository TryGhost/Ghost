**To remove tags from an existing resource**

The following ``untag-resource`` example removes the specified tags from an existing subscriber resource. ::

    aws securitylake untag-resource \
        --resource-arn "arn:aws:securitylake:us-east-1:123456789012:subscriber/1234abcd-12ab-34cd-56ef-1234567890ab" \
        --tags Environment Owner

This command produces no output.

For more information, see `Tagging Amazon Security Lake resources <https://docs.aws.amazon.com/security-lake/latest/userguide/tagging-resources.html#tags-retrieve>`__ in the *Amazon Security Lake User Guide*.
