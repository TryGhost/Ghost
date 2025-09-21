**To create a prefix list**

The following ``create-managed-prefix-list`` example creates an IPv4 prefix list with a maximum of 10 entries, and creates 2 entries in the prefix list. ::

    aws ec2 create-managed-prefix-list \
        --address-family IPv4 \
        --max-entries 10 \
        --entries Cidr=10.0.0.0/16,Description=vpc-a Cidr=10.2.0.0/16,Description=vpc-b \
        --prefix-list-name vpc-cidrs

Output::

    {
        "PrefixList": {
            "PrefixListId": "pl-0123456abcabcabc1",
            "AddressFamily": "IPv4",
            "State": "create-in-progress",
            "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-0123456abcabcabc1",
            "PrefixListName": "vpc-cidrs",
            "MaxEntries": 10,
            "Version": 1,
            "Tags": [],
            "OwnerId": "123456789012"
        }
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
