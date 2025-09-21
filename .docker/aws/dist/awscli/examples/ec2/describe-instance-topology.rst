**To describe the instance topology of all your instances**

The following ``describe-instance-topology`` example describes the topology of all your instances that match the supported instance types for this command. ::

    aws ec2 describe-instance-topology \
        --region us-west-2

Output::

    {
        "Instances": [
            {
                "InstanceId": "i-1111111111example",
                "InstanceType": "p4d.24xlarge",
                "GroupName": "my-ml-cpg",
                "NetworkNodes": [
                    "nn-1111111111example",
                    "nn-2222222222example",
                    "nn-3333333333example"
                ],
                "ZoneId": "usw2-az2",
                "AvailabilityZone": "us-west-2a"
            },
            {
                "InstanceId": "i-2222222222example",
                "InstanceType": "p4d.24xlarge",
                "NetworkNodes": [
                    "nn-1111111111example",
                    "nn-2222222222example",
                    "nn-3333333333example"
                ],
                "ZoneId": "usw2-az2",
                "AvailabilityZone": "us-west-2a"
            },
            {
                "InstanceId": "i-3333333333example",
                "InstanceType": "trn1.32xlarge",
                "NetworkNodes": [
                    "nn-1212121212example",
                    "nn-1211122211example",
                    "nn-1311133311example"
                ],
                "ZoneId": "usw2-az4",
                "AvailabilityZone": "us-west-2d"            
            },
            {
                "InstanceId": "i-444444444example",
                "InstanceType": "trn1.2xlarge",
                "NetworkNodes": [
                    "nn-1111111111example",
                    "nn-5434334334example",
                    "nn-1235301234example"
                ],
                "ZoneId": "usw2-az2",
                "AvailabilityZone": "us-west-2a"          
            }
        ],
        "NextToken": "SomeEncryptedToken"
    }

For more information, including more examples, see `Amazon EC2 instance topology <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-topology.html>`__ in the *Amazon EC2 User Guide*.