us-west-2**To restore a prefix list version**

The following ``restore-managed-prefix-list-version`` restores the entries from version 1 of the specified prefix list. ::

    aws ec2 restore-managed-prefix-list-version \
        --prefix-list-id pl-0123456abcabcabc1 \
        --current-version 2 \
        --previous-version 1

Output::

    {
        "PrefixList": {
            "PrefixListId": "pl-0123456abcabcabc1",
            "AddressFamily": "IPv4",
            "State": "restore-in-progress",
            "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-0123456abcabcabc1",
            "PrefixListName": "vpc-cidrs",
            "MaxEntries": 10,
            "Version": 2,
            "OwnerId": "123456789012"
        }
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
