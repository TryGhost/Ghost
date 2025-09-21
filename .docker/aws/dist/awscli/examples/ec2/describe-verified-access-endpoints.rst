**To describe a Verified Access endpoint**

The following ``describe-verified-access-endpoints`` example describes the specified Verified Access endpoint. ::

    aws ec2 describe-verified-access-endpoints \
        --verified-access-endpoint-ids vae-066fac616d4d546f2

Output::

    {
        "VerifiedAccessEndpoints": [
            {
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
                    "Code": "active"
                },
                "Description": "",
                "CreationTime": "2023-08-25T20:54:43",
                "LastUpdatedTime": "2023-08-25T22:17:26",
                "Tags": [
                    {
                        "Key": "Name",
                        "Value": "my-va-endpoint"
                    }
                ]
            }
        ]
    }

For more information, see `Verified Access endpoints <https://docs.aws.amazon.com/verified-access/latest/ug/verified-access-endpoints.html>`__ in the *AWS Verified Access User Guide*.
