**To list the tags applied to a patch baseline**

The following ``list-tags-for-resource`` example lists the tags for a patch baseline. ::

    aws ssm list-tags-for-resource \
        --resource-type "PatchBaseline" \
        --resource-id "pb-0123456789abcdef0"

Output::

    {
        "TagList": [
            {
                "Key": "Environment",
                "Value": "Production"
            },
            {
                "Key": "Region",
                "Value": "EMEA"
            }
        ]
    }

For more information, see `Tagging AWS Resources <https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html>`__ in the *AWS General Reference*.