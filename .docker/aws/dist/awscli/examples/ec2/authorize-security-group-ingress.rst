**Example 1: To add a rule that allows inbound SSH traffic**

The following ``authorize-security-group-ingress`` example adds a rule that allows inbound traffic on TCP port 22 (SSH). ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --protocol tcp \
        --port 22 \
        --cidr 203.0.113.0/24

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-01afa97ef3e1bedfc",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 22,
                "ToPort": 22,
                "CidrIpv4": "203.0.113.0/24"
            }
        ]
    }

**Example 2: To add a rule that allows inbound HTTP traffic from another security group**

The following ``authorize-security-group-ingress`` example adds a rule that allows inbound access on TCP port 80 from the source security group ``sg-1a2b3c4d``. The source group must be in the same VPC or in a peer VPC (requires a VPC peering connection). Incoming traffic is allowed based on the private IP addresses of instances that are associated with the source security group (not the public IP address or Elastic IP address). ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --protocol tcp \
        --port 80 \
        --source-group sg-1a2b3c4d

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-01f4be99110f638a7",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80,
                "ReferencedGroupInfo": {
                    "GroupId": "sg-1a2b3c4d",
                    "UserId": "123456789012"
                }
            }
        ]
    }

**Example 3: To add multiple rules in the same call**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add two inbound rules, one that enables inbound access on TCP port 3389 (RDP) and the other that enables ping/ICMP. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=tcp,FromPort=3389,ToPort=3389,IpRanges=[{CidrIp=172.31.0.0/16}]" "IpProtocol=icmp,FromPort=-1,ToPort=-1,IpRanges=[{CidrIp=172.31.0.0/16}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-00e06e5d3690f29f3",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 3389,
                "ToPort": 3389,
                "CidrIpv4": "172.31.0.0/16"
            },
            {
                "SecurityGroupRuleId": "sgr-0a133dd4493944b87",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": -1,
                "ToPort": -1,
                "CidrIpv4": "172.31.0.0/16"
            }
        ]
    }

**Example 4: To add a rule for ICMP traffic**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add an inbound rule that allows the ICMP message ``Destination Unreachable: Fragmentation Needed and Don't Fragment was Set`` (Type 3, Code 4) from anywhere. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=icmp,FromPort=3,ToPort=4,IpRanges=[{CidrIp=0.0.0.0/0}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-0de3811019069b787",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "icmp",
                "FromPort": 3,
                "ToPort": 4,
                "CidrIpv4": "0.0.0.0/0"
            }
        ]
    }

**Example 5: To add a rule for IPv6 traffic**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add an inbound rule that allows SSH access (port 22) from the IPv6 range ``2001:db8:1234:1a00::/64``. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=tcp,FromPort=22,ToPort=22,Ipv6Ranges=[{CidrIpv6=2001:db8:1234:1a00::/64}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-0455bc68b60805563",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 22,
                "ToPort": 22,
                "CidrIpv6": "2001:db8:1234:1a00::/64"
            }
        ]
    }

**Example 6: To add a rule for ICMPv6 traffic**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add an inbound rule that allows ICMPv6 traffic from anywhere. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=icmpv6,Ipv6Ranges=[{CidrIpv6=::/0}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-04b612d9363ab6327",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "icmpv6",
                "FromPort": -1,
                "ToPort": -1,
                "CidrIpv6": "::/0"
            }
        ]
    }

**Example 7: Add a rule with a description**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add an inbound rule that allows RDP traffic from the specified IPv4 address range. The rule includes a description to help you identify it later. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-1234567890abcdef0 \
        --ip-permissions 'IpProtocol=tcp,FromPort=3389,ToPort=3389,IpRanges=[{CidrIp=203.0.113.0/24,Description='RDP access from NY office'}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-0397bbcc01e974db3",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 3389,
                "ToPort": 3389,
                "CidrIpv4": "203.0.113.0/24",
                "Description": "RDP access from NY office"
            }
        ]
    }
        
**Example 8: To add an inbound rule that uses a prefix list**

The following ``authorize-security-group-ingress`` example uses the ``ip-permissions`` parameter to add an inbound rule that allows all traffic for the CIDR ranges in the specified prefix list. ::

    aws ec2 authorize-security-group-ingress \
        --group-id sg-04a351bfe432d4e71 \
        --ip-permissions 'IpProtocol=all,PrefixListIds=[{PrefixListId=pl-002dc3ec097de1514}]'

Output::

    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-09c74b32f677c6c7c",
                "GroupId": "sg-1234567890abcdef0",
                "GroupOwnerId": "123456789012",
                "IsEgress": false,
                "IpProtocol": "-1",
                "FromPort": -1,
                "ToPort": -1,
                "PrefixListId": "pl-0721453c7ac4ec009"
            }
        ]
    }

For more information, see `Security groups <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html>`__ in the *Amazon VPC User Guide*.
