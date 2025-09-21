**Example 1: To describe all VPC endpoint services**

The following ``describe-vpc-endpoint-services`` example lists all VPC endpoint services for an AWS Region. ::

    aws ec2 describe-vpc-endpoint-services

Output::

    {
        "ServiceDetails": [
            {
                "ServiceType": [
                    {
                        "ServiceType": "Gateway"
                    }
                ], 
                "AcceptanceRequired": false, 
                "ServiceName": "com.amazonaws.us-east-1.dynamodb", 
                "VpcEndpointPolicySupported": true, 
                "Owner": "amazon", 
                "AvailabilityZones": [
                    "us-east-1a", 
                    "us-east-1b", 
                    "us-east-1c", 
                    "us-east-1d", 
                    "us-east-1e", 
                    "us-east-1f"
                ], 
                "BaseEndpointDnsNames": [
                    "dynamodb.us-east-1.amazonaws.com"
                ]
            }, 
            {
                "ServiceType": [
                    {
                        "ServiceType": "Interface"
                    }
                ], 
                "PrivateDnsName": "ec2.us-east-1.amazonaws.com", 
                "ServiceName": "com.amazonaws.us-east-1.ec2", 
                "VpcEndpointPolicySupported": false, 
                "Owner": "amazon", 
                "AvailabilityZones": [
                    "us-east-1a", 
                    "us-east-1b", 
                    "us-east-1c", 
                    "us-east-1d", 
                    "us-east-1e", 
                    "us-east-1f"
                ], 
                "AcceptanceRequired": false, 
                "BaseEndpointDnsNames": [
                    "ec2.us-east-1.vpce.amazonaws.com"
                ]
            }, 
            {
                "ServiceType": [
                    {
                        "ServiceType": "Interface"
                    }
                ], 
                "PrivateDnsName": "ssm.us-east-1.amazonaws.com", 
                "ServiceName": "com.amazonaws.us-east-1.ssm", 
                "VpcEndpointPolicySupported": true, 
                "Owner": "amazon", 
                "AvailabilityZones": [
                    "us-east-1a", 
                    "us-east-1b", 
                    "us-east-1c", 
                    "us-east-1d", 
                    "us-east-1e"
                ], 
                "AcceptanceRequired": false, 
                "BaseEndpointDnsNames": [
                    "ssm.us-east-1.vpce.amazonaws.com"
                ]
            }
        ], 
        "ServiceNames": [
            "com.amazonaws.us-east-1.dynamodb", 
            "com.amazonaws.us-east-1.ec2", 
            "com.amazonaws.us-east-1.ec2messages", 
            "com.amazonaws.us-east-1.elasticloadbalancing", 
            "com.amazonaws.us-east-1.kinesis-streams", 
            "com.amazonaws.us-east-1.s3", 
            "com.amazonaws.us-east-1.ssm"
        ]
    }

**Example 2: To describe the details about an endpoint service**

The following ``describe-vpc-endpoint-services`` example lists the details of the Amazon S3 interface endpoint service. ::

    aws ec2 describe-vpc-endpoint-services \
        --filter 'Name=service-type,Values=Interface' Name=service-name,Values=com.amazonaws.us-east-1.s3

Output::

    {
        "ServiceDetails": [
            {
                "ServiceName": "com.amazonaws.us-east-1.s3",
                "ServiceId": "vpce-svc-081d84efcdEXAMPLE",
                "ServiceType": [
                    {
                        "ServiceType": "Interface"
                    }
                ],
                "AvailabilityZones": [
                    "us-east-1a",
                    "us-east-1b",
                    "us-east-1c",
                    "us-east-1d",
                    "us-east-1e",
                "us-east-1f"
                ],
                "Owner": "amazon",
                "BaseEndpointDnsNames": [
                    "s3.us-east-1.vpce.amazonaws.com"
                ],
                "VpcEndpointPolicySupported": true,
                "AcceptanceRequired": false,
                "ManagesVpcEndpoints": false,
                "Tags": []
            }
        ],
        "ServiceNames": [
            "com.amazonaws.us-east-1.s3"
        ]
    }

For more information, see `View available AWS service names <https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html#vpce-view-available-services>`__ in the *AWS PrivateLink User Guide*.
