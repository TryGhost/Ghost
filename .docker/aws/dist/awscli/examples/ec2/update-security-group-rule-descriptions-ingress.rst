**Example 1: To update the description of an inbound security group rule with a CIDR source**

The following ``update-security-group-rule-descriptions-ingress`` example updates the description for the security group rule for the specified port and IPv4 address range. The description '``SSH access from ABC office``' replaces any existing description for the rule. ::

    aws ec2 update-security-group-rule-descriptions-ingress \
        --group-id sg-02f0d35a850ba727f \
        --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=203.0.113.0/16,Description="SSH access from corpnet"}]'

Output::

    {
        "Return": true
    }

For more information, see `Security group rules <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html#security-group-rules>`__ in the *Amazon EC2 User Guide*.

**Example 2: To update the description of an inbound security group rule with a prefix list source**

The following ``update-security-group-rule-descriptions-ingress`` example updates the description for the security group rule for the specified port and prefix list. The description '``SSH access from ABC office``' replaces any existing description for the rule. ::

    aws ec2 update-security-group-rule-descriptions-ingress \
        --group-id sg-02f0d35a850ba727f \
        --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,PrefixListIds='[{PrefixListId=pl-12345678,Description="SSH access from corpnet"}]'

Output::

    {
        "Return": true
    }

For more information, see `Security group rules <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html#security-group-rules>`__ in the *Amazon EC2 User Guide*.
