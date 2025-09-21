**To create an EC2 Instance Connect Endpoint**

The following ``create-instance-connect-endpoint`` example creates an EC2 Instance Connect Endpoint in the specified subnet. ::

    aws ec2 create-instance-connect-endpoint \
        --region us-east-1 \
        --subnet-id subnet-0123456789example

Output::

    {
        "VpcId": "vpc-0123abcd",
        "InstanceConnectEndpointArn": "arn:aws:ec2:us-east-1:111111111111:instance-connect-endpoint/eice-0123456789example",
        "AvailabilityZone": "us-east-1a",
        "NetworkInterfaceIds": [
            "eni-0123abcd"
        ],
        "PreserveClientIp": true,
        "Tags": [],
        "FipsDnsName": "eice-0123456789example.0123abcd.fips.ec2-instance-connect-endpoint.us-east-1.amazonaws.com",
        "StateMessage": "",
        "State": "create-complete",
        "DnsName": "eice-0123456789example.0123abcd.ec2-instance-connect-endpoint.us-east-1.amazonaws.com",
        "SubnetId": "subnet-0123abcd",
        "OwnerId": "111111111111",
        "SecurityGroupIds": [
            "sg-0123abcd"
        ],
        "InstanceConnectEndpointId": "eice-0123456789example",
        "CreatedAt": "2023-04-07T15:43:53.000Z"
    }

For more information, see `Create an EC2 Instance Connect Endpoint <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-ec2-instance-connect-endpoints.html>`__ in the *Amazon EC2 User Guide*.
