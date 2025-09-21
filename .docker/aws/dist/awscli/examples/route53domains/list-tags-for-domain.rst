**To list tags for a domain**

The following ``list-tags-for-domain`` command lists the tags that are currently associated with the specified domain. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains list-tags-for-domain \
        --region us-east-1 \
        --domain-name example.com

Output::

    {
        "TagList": [
            {
                "Key": "key1",
                "Value": "value1"
            },
            {
                "Key": "key2",
                "Value": "value2"
            }
        ]
    }

For more information, see `Tagging Amazon Route 53 Resources <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/tagging-resources.html>`__ in the *Amazon Route 53 Developer Guide*.
