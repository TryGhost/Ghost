**To get a list of all tag keys**

The following ``get-tag-keys`` example retrieves the list of all tag key names used by resources in the account. ::

    aws resourcegroupstaggingapi get-tag-keys

Output::

    {
        "TagKeys": [
            "Environment",
            "CostCenter",
            "Department"
        ]
    }


For more information, see `GetTagKeys <https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetTagKeys.html>`__ in the *Resource Groups Tagging API Reference*.
