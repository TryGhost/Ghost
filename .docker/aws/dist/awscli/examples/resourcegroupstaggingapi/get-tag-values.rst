**To get a list of all tag values**

The following ``get-tag-values`` example displays all of the values used for the specified key for all resources in the  ::

    aws resourcegroupstaggingapi get-tag-values \
        --key=Environment

Output::

    {
        "TagValues": [
            "Alpha",
            "Gamma",
            "Production"
        ]
    }

For more information, see `GetTagValues <https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetTagValues.html>`__ in the *Resource Groups Tagging API Reference*.
