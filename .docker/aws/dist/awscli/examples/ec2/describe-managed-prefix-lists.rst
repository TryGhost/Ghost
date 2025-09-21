**To describe managed prefix lists**

The following ``describe-managed-prefix-lists`` example describes the prefix lists owned by AWS account ``123456789012``. ::

    aws ec2 describe-managed-prefix-lists \
        --filters Name=owner-id,Values=123456789012

Output::

    {
        "PrefixLists": [
            {
                "PrefixListId": "pl-11223344556677aab",
                "AddressFamily": "IPv6",
                "State": "create-complete",
                "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-11223344556677aab",
                "PrefixListName": "vpc-ipv6-cidrs",
                "MaxEntries": 25,
                "Version": 1,
                "Tags": [],
                "OwnerId": "123456789012"
            },
            {
                "PrefixListId": "pl-0123456abcabcabc1",
                "AddressFamily": "IPv4",
                "State": "active",
                "PrefixListArn": "arn:aws:ec2:us-west-2:123456789012:prefix-list/pl-0123456abcabcabc1",
                "PrefixListName": "vpc-cidrs",
                "MaxEntries": 10,
                "Version": 1,
                "Tags": [],
                "OwnerId": "123456789012"
          }
      ]
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
