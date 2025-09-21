**To view security groups that can be associated with network interfaces in a specified VPC.**

The following ``get-security-groups-for-vpc`` example shows the security groups that can be associated with network interfaces in the VPC. ::

    aws ec2 get-security-groups-for-vpc \
        --vpc-id vpc-6c31a611 \
        --region us-east-1

Output::

    {
        "SecurityGroupForVpcs": [
            {
                "Description": "launch-wizard-36 created 2022-08-29T15:59:35.338Z",
                "GroupName": "launch-wizard-36",
                "OwnerId": "470889052923",
                "GroupId": "sg-007e0c3027ee885f5",
                "Tags": [],
                "PrimaryVpcId": "vpc-6c31a611"
            },
            {
                "Description": "launch-wizard-18 created 2024-01-19T20:22:27.527Z",
                "GroupName": "launch-wizard-18",
                "OwnerId": "470889052923",
                "GroupId": "sg-0147193bef51c9eef",
                "Tags": [],
                "PrimaryVpcId": "vpc-6c31a611"
            }
    }