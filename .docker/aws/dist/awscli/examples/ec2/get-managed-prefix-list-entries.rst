**To get the entries for a prefix list**

The following ``get-managed-prefix-list-entries`` gets the entries for the specified prefix list. ::

    aws ec2 get-managed-prefix-list-entries \
        --prefix-list-id pl-0123456abcabcabc1

Output::

    {
        "Entries": [
            {
                "Cidr": "10.0.0.0/16",
                "Description": "vpc-a"
            },
            {
                "Cidr": "10.2.0.0/16",
                "Description": "vpc-b"
            }
        ]
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
