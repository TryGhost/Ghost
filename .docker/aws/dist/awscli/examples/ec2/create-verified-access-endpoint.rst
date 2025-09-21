**To create a Verified Access endpoint**

The following ``create-verified-access-endpoint`` example creates a Verified Access endpoint for the speciied Verified Access group. The specified network interface and security group must belong to the same VPC. ::

    aws ec2 create-verified-access-endpoint \
        --verified-access-group-id vagr-0dbe967baf14b7235 \
        --endpoint-type network-interface \
        --attachment-type vpc \
        --domain-certificate-arn arn:aws:acm:us-east-2:123456789012:certificate/eb065ea0-26f9-4e75-a6ce-0a1a7EXAMPLE \
        --application-domain example.com \
        --endpoint-domain-prefix my-ava-app \
        --security-group-ids sg-004915970c4c8f13a \
        --network-interface-options NetworkInterfaceId=eni-0aec70418c8d87a0f,Protocol=https,Port=443 \
        --tag-specifications ResourceType=verified-access-endpoint,Tags=[{Key=Name,Value=my-va-endpoint}]

Output::

    {
        "VerifiedAccessEndpoint": {
            "VerifiedAccessInstanceId": "vai-0ce000c0b7643abea",
            "VerifiedAccessGroupId": "vagr-0dbe967baf14b7235",
            "VerifiedAccessEndpointId": "vae-066fac616d4d546f2",
            "ApplicationDomain": "example.com",
            "EndpointType": "network-interface",
            "AttachmentType": "vpc",
            "DomainCertificateArn": "arn:aws:acm:us-east-2:123456789012:certificate/eb065ea0-26f9-4e75-a6ce-0a1a7EXAMPLE",
            "EndpointDomain": "my-ava-app.edge-00c3372d53b1540bb.vai-0ce000c0b7643abea.prod.verified-access.us-east-2.amazonaws.com",
            "SecurityGroupIds": [
                "sg-004915970c4c8f13a"
            ],
            "NetworkInterfaceOptions": {
                "NetworkInterfaceId": "eni-0aec70418c8d87a0f",
                "Protocol": "https",
                "Port": 443
            },
            "Status": {
                "Code": "pending"
            },
            "Description": "",
            "CreationTime": "2023-08-25T20:54:43",
            "LastUpdatedTime": "2023-08-25T20:54:43",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-va-endpoint"
                }
            ]
        }
    }

For more information, see `Verified Access endpoints <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-endpoints.html>`__ in the *AWS Verified Access User Guide*.