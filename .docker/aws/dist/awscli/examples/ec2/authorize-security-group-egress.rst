**Example 1: To add a rule that allows outbound traffic to a specific address range**

The following ``authorize-security-group-egress`` example adds a rule that grants access to the specified address ranges on TCP port 80. ::

    aws ec2 authorize-security-group-egress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=10.0.0.0/16}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-0b15794cdb17bf29c",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": true,
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80,
                "CidrIpv4": "10.0.0.0/16"
            }
        ]
    }

**Example 2: To add a rule that allows outbound traffic to a specific security group**

The following ``authorize-security-group-egress`` example adds a rule that grants access to the specified security group on TCP port 80. ::

    aws ec2 authorize-security-group-egress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=tcp,FromPort=80,ToPort=80,UserIdGroupPairs=[{GroupId=sg-0aad1c26bbeec5c22}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-0b5dd815afcea9cc3",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": true,
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80,
                "ReferencedGroupInfo": {
                    "GroupId": "sg-0aad1c26bbeec5c22",
                    "UserId": "123456789012"
                }
            }
        ]
    }

For more information, see `Security groups <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html>`__ in the *Amazon VPC User Guide*.
