**To modify a security group rules to update the rule description, the IP protocol, and the CidrIpv4 address range**

The following ``modify-security-group-rules`` example updates the description, the IP protocol, and the IPV4 CIDR range of a specified security group rule. Use the ``security-group-rules`` parameter to enter the updates for the specified security group rules. ``-1`` specifies all protocols. ::

    aws ec2 modify-security-group-rules \
        --group-id sg-1234567890abcdef0 \
        --security-group-rules SecurityGroupRuleId=sgr-abcdef01234567890,SecurityGroupRule='{Description=test,IpProtocol=-1,CidrIpv4=0.0.0.0/0}'

Output::

    {
        "Return": true
    }

For more information about security group rules, see `Security group rules <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html>`__ in the *Amazon EC2 User Guide*.