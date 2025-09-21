**To delete a prefix list**

The following ``delete-managed-prefix-list`` example deletes the specified prefix list. ::

    aws ec2 delete-managed-prefix-list \
        --prefix-list-id pl-0123456abcabcabc1

Output::

    {
        "PrefixList": {
            "PrefixListId": "pl-0123456abcabcabc1",
            "AddressFamily": "IPv4",
            "State": "delete-in-progress",
            "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-0123456abcabcabc1",
            "PrefixListName": "test",
            "MaxEntries": 10,
            "Version": 1,
            "OwnerId": "123456789012"
        }
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
