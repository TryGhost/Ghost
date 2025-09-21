**To describe the longer ID format settings for all resource types in a Region**

The following ``describe-aggregate-id-format`` example describes the overall long ID format status for the current Region. The ``Deadline`` value indicates that the deadlines for these resources to permanently switch from the short ID format to the long ID format expired. The ``UseLongIdsAggregated`` value indicates that all IAM users and IAM roles are configured to use long ID format for all resource types. ::

    aws ec2 describe-aggregate-id-format

Output::

    {
        "UseLongIdsAggregated": true,
        "Statuses": [
            {
                "Deadline": "2018-08-13T02:00:00.000Z",
                "Resource": "network-interface-attachment",
                "UseLongIds": true
            },
            {
                "Deadline": "2016-12-13T02:00:00.000Z",
                "Resource": "instance",
                "UseLongIds": true
            },
            {
                "Deadline": "2018-08-13T02:00:00.000Z",
                "Resource": "elastic-ip-association",
                "UseLongIds": true
            },
            ...
        ]
    }