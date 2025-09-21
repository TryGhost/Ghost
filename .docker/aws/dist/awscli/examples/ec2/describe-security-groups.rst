**Example 1: To describe a security group**

The following ``describe-security-groups`` example describes the specified security group. ::

    aws ec2 describe-security-groups \
        --group-ids sg-903004f8

Output::

    {
        "SecurityGroups": [
            {
                "IpPermissionsEgress": [
                    {
                        "IpProtocol": "-1",
                        "IpRanges": [
                            {
                                "CidrIp": "0.0.0.0/0"
                            }
                        ],
                        "UserIdGroupPairs": [],
                        "PrefixListIds": []
                    }
                ],
                "Description": "My security group",
                "Tags": [
                    {
                        "Value": "SG1", 
                        "Key": "Name"
                    }
                ], 
                "IpPermissions": [
                    {
                        "IpProtocol": "-1", 
                        "IpRanges": [], 
                        "UserIdGroupPairs": [
                            {
                                "UserId": "123456789012", 
                                "GroupId": "sg-903004f8"
                            }
                        ], 
                        "PrefixListIds": []
                    },
                    {
                        "PrefixListIds": [], 
                        "FromPort": 22, 
                        "IpRanges": [
                            {
                                "Description": "Access from NY office",
                                "CidrIp": "203.0.113.0/24"
                            }
                        ], 
                        "ToPort": 22, 
                        "IpProtocol": "tcp", 
                        "UserIdGroupPairs": []
                        }
                ],
                "GroupName": "MySecurityGroup",
                "VpcId": "vpc-1a2b3c4d",
                "OwnerId": "123456789012",
                "GroupId": "sg-903004f8",
            }
        ]
    }

**Example 2: To describe security groups that have specific rules**

The following ``describe-security-groups`` example uses filters to scope the results to security groups that have a rule that allows SSH traffic (port 22) and a rule that allows traffic from all addresses (``0.0.0.0/0``). The example uses the ``--query`` parameter to display only the names of the security groups. Security groups must match all filters to be returned in the results; however, a single rule does not have to match all filters. For example, the output returns a security group with a rule that allows SSH traffic from a specific IP address and another rule that allows HTTP traffic from all addresses. ::

    aws ec2 describe-security-groups \
        --filters Name=ip-permission.from-port,Values=22 Name=ip-permission.to-port,Values=22 Name=ip-permission.cidr,Values='0.0.0.0/0' \
        --query "SecurityGroups[*].[GroupName]" \
        --output text

Output::

    default
    my-security-group
    web-servers
    launch-wizard-1

**Example 3: To describe security groups based on tags**

The following ``describe-security-groups`` example uses filters to scope the results to security groups that include ``test`` in the security group name, and that have the tag ``Test=To-delete``. The example uses the ``--query`` parameter to display only the names and IDs of the security groups. ::

    aws ec2 describe-security-groups \
        --filters Name=group-name,Values=*test* Name=tag:Test,Values=To-delete \
        --query "SecurityGroups[*].{Name:GroupName,ID:GroupId}"
  
Output::

    [
        {
            "Name": "testfornewinstance", 
            "ID": "sg-33bb22aa"
        }, 
        {
            "Name": "newgrouptest", 
            "ID": "sg-1a2b3c4d"
        }
    ]

For additional examples using tag filters, see `Working with tags <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#Using_Tags_CLI>`__ in the *Amazon EC2 User Guide*.