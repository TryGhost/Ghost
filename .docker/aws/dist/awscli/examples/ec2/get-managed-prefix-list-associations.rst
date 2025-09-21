**To get prefix list associations**

The following ``get-managed-prefix-list-associations`` example gets the resources that are associated with the specified prefix list. ::

    aws ec2 get-managed-prefix-list-associations \
        --prefix-list-id pl-0123456abcabcabc1

Output::

    {
        "PrefixListAssociations": [
            {
                "ResourceId": "sg-0abc123456abc12345",
                "ResourceOwner": "123456789012"
            }
        ]
    }

For more information, see `Managed prefix lists <https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html>`__ in the *Amazon VPC User Guide*.
