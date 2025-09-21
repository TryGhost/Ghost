**To update the description of an outbound security group rule**

The following ``update-security-group-rule-descriptions-egress`` example updates the description for the security group rule for the specified port and IPv4 address range. The description '``Outbound HTTP access to server 2``' replaces any existing description for the rule. ::

    aws ec2 update-security-group-rule-descriptions-egress \
        --group-id sg-02f0d35a850ba727f \
        --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=203.0.113.0/24,Description="Outbound HTTP access to server 2"}]

Output::

    {
        "Return": true
    }

For more information, see `Security group rules <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html#security-group-rules>`__ in the *Amazon EC2 User Guide*.
