**To describe an EC2 Instance Connect Endpoint**

The following ``describe-instance-connect-endpoints`` example describes the specified EC2 Instance Connect Endpoint. ::

    aws ec2 describe-instance-connect-endpoints \
        --region us-east-1 \
        --instance-connect-endpoint-ids eice-0123456789example

Output::

    {
        "InstanceConnectEndpoints": [
            {
                "OwnerId": "111111111111",
                "InstanceConnectEndpointId": "eice-0123456789example",
                "InstanceConnectEndpointArn": "arn:aws:ec2:us-east-1:111111111111:instance-connect-endpoint/eice-0123456789example",
                "State": "create-complete",
                "StateMessage": "",
                "DnsName": "eice-0123456789example.b67b86ba.ec2-instance-connect-endpoint.us-east-1.amazonaws.com",
                "NetworkInterfaceIds": [
                    "eni-0123456789example"
                ],
                "VpcId": "vpc-0123abcd",
                "AvailabilityZone": "us-east-1d",
                "CreatedAt": "2023-02-07T12:05:37+00:00",
                "SubnetId": "subnet-0123abcd",
                "Tags": []
            }
        ]
    }

For more information, see `Create an EC2 Instance Connect Endpoint <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-ec2-instance-connect-endpoints.html>`__ in the *Amazon EC2 User Guide*.
