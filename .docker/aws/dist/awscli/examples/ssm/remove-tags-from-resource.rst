**To remove a tag from a patch baseline**

The following ``remove-tags-from-resource`` example removes tags from a patch baseline. ::

    aws ssm remove-tags-from-resource \
        --resource-type "PatchBaseline" \
        --resource-id "pb-0123456789abcdef0" \
        --tag-keys "Region"

This command produces no output.

For more information, see `Tagging AWS Resources <https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html>`__ in the *AWS General Reference*.
