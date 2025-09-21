**To describe your network ACLs**

The following ``describe-network-acls`` example retrieves details about your network ACLs. ::

    aws ec2 describe-network-acls

Output::

    {
        "NetworkAcls": [
            {
                "Associations": [
                    {
                        "NetworkAclAssociationId": "aclassoc-0c1679dc41EXAMPLE",
                        "NetworkAclId": "acl-0ea1f54ca7EXAMPLE",
                        "SubnetId": "subnet-0931fc2fa5EXAMPLE"
                    }
                ],
                "Entries": [
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": true,
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 100
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": true,
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32767
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": false,
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 100
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": false,
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32767
                    }
                ],
                "IsDefault": true,
                "NetworkAclId": "acl-0ea1f54ca7EXAMPLE",
                "Tags": [],
                "VpcId": "vpc-06e4ab6c6cEXAMPLE",
                "OwnerId": "111122223333"
            },
            {
                "Associations": [],
                "Entries": [
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": true,
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 100
                    },
                    {
                        "Egress": true,
                        "Ipv6CidrBlock": "::/0",
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 101
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": true,
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32767
                    },
                    {
                        "Egress": true,
                        "Ipv6CidrBlock": "::/0",
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32768
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": false,
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 100
                    },
                    {
                        "Egress": false,
                        "Ipv6CidrBlock": "::/0",
                        "Protocol": "-1",
                        "RuleAction": "allow",
                        "RuleNumber": 101
                    },
                    {
                        "CidrBlock": "0.0.0.0/0",
                        "Egress": false,
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32767
                    },
                    {
                        "Egress": false,
                        "Ipv6CidrBlock": "::/0",
                        "Protocol": "-1",
                        "RuleAction": "deny",
                        "RuleNumber": 32768
                    }
                ],
                "IsDefault": true,
                "NetworkAclId": "acl-0e2a78e4e2EXAMPLE",
                "Tags": [],
                "VpcId": "vpc-03914afb3eEXAMPLE",
                "OwnerId": "111122223333"
            }
        ]
    }
                  

For more information, see `Network ACLs <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html>`__ in the *AWS VPC User Guide*.
