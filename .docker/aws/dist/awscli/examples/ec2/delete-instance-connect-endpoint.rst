**To delete an EC2 Instance Connect Endpoint**

The following ``delete-instance-connect-endpoint`` example deletes the specified EC2 Instance Connect Endpoint. ::

    aws ec2 delete-instance-connect-endpoint \
        --instance-connect-endpoint-id eice-03f5e49b83924bbc7

Output::

    {
        "InstanceConnectEndpoint": {
            "OwnerId": "111111111111",
            "InstanceConnectEndpointId": "eice-0123456789example",
            "InstanceConnectEndpointArn": "arn:aws:ec2:us-east-1:111111111111:instance-connect-endpoint/eice-0123456789example",
            "State": "delete-in-progress",
            "StateMessage": "",
            "NetworkInterfaceIds": [],
            "VpcId": "vpc-0123abcd",
            "AvailabilityZone": "us-east-1d",
            "CreatedAt": "2023-02-07T12:05:37+00:00",
            "SubnetId": "subnet-0123abcd"
        }
    }

For more information, see `Remove EC2 Instance Connect Endpoint <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/delete-ec2-instance-connect-endpoint.html>`__ in the *Amazon EC2 User Guide*.
