**To remove tags from a resource group**

The following ``untags`` example removes any tag with the specified key from the resource group itself, not its members. ::

    aws resource-groups untag \
        --arn arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer \
        --keys QueryType

Output::

    {
        "Arn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
        "Keys": [
            "QueryType"
        ]
    }

For more information, see `Manage tags <https://docs.aws.amazon.com/ARG/latest/userguide/tagging-resources.html>`__ in the *AWS Resource Groups User Guide*.