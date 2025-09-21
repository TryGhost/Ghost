**To modify a prefix list**

The following ``modify-managed-prefix-list`` example adds an entry to the specified prefix list. ::

    aws ec2 modify-managed-prefix-list \
        --prefix-list-id pl-0123456abcabcabc1 \
        --add-entries Cidr=10.1.0.0/16,Description=vpc-c \
        --current-version 1

Output::

    {
        "PrefixList": {
            "PrefixListId": "pl-0123456abcabcabc1",
            "AddressFamily": "IPv4",
            "State": "modify-in-progress",
            "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-0123456abcabcabc1",
            "PrefixListName": "vpc-cidrs",
            "MaxEntries": 10,
            "Version": 1,
            "OwnerId": "123456789012"
        }
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
