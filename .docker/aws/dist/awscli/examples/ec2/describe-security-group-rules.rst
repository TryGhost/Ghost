**Example 1: To describe the security group rules for a security group**

The following ``describe-security-group-rules`` example describes the security group rules of a specified security group. Use the ``filters`` option to scope the results to a specific security group. ::

    aws ec2 describe-security-group-rules \
        --filters Name="group-id",Values="sg-1234567890abcdef0"

Output::

    {
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-abcdef01234567890",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "111122223333",
                "IsEgress": false,
                "IpProtocol": "-1",
                "FromPort": -1,
                "ToPort": -1,
                "ReferencedGroupInfo": {
                    "GroupId": "sg-1234567890abcdef0",
                    "UserId": "111122223333"
                },
                "Tags": []
            },
            {
                "SecurityGroupRuleId": "sgr-bcdef01234567890a",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "111122223333",
                "IsEgress": true,
                "IpProtocol": "-1",
                "FromPort": -1,
                "ToPort": -1,
                "CidrIpv6": "::/0",
                "Tags": []
            },
            {
                "SecurityGroupRuleId": "sgr-cdef01234567890ab",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "111122223333",
                "IsEgress": true,
                "IpProtocol": "-1",
                "FromPort": -1,
                "ToPort": -1,
                "CidrIpv4": "0.0.0.0/0",
                "Tags": []
            }
        ]
    }

**Example 2: To describe a security group rule**

The following ``describe-security-group-rules`` example describes the specified security group rule. ::

    aws ec2 describe-security-group-rules \
        --security-group-rule-ids sgr-cdef01234567890ab

Output::

    {
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-cdef01234567890ab",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "111122223333",
                "IsEgress": true,
                "IpProtocol": "-1",
                "FromPort": -1,
                "ToPort": -1,
                "CidrIpv4": "0.0.0.0/0",
                "Tags": []
            }
        ]
    }

For more information, see `Security group rules <https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html>`__ in the *Amazon VPC User Guide*.
