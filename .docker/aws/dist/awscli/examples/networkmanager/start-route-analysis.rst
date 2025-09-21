**To start route analysis**

The following ``start-route-analysis`` example starts the analysis between a source and destination, including the optional ``include-return-path``. ::

    aws networkmanager start-route-analysis \
        --global-network-id global-network-00aa0aaa0b0aaa000 \
        --source TransitGatewayAttachmentArn=arn:aws:ec2:us-east-1:503089527312:transit-gateway-attachment/tgw-attach-0d4a2d491bf68c093,IpAddress=10.0.0.0 \
        --destination TransitGatewayAttachmentArn=arn:aws:ec2:us-west-1:503089527312:transit-gateway-attachment/tgw-attach-002577f30bb181742,IpAddress=11.0.0.0 \
        --include-return-path

Output::

    {
        "RouteAnalysis": {
            "GlobalNetworkId": "global-network-00aa0aaa0b0aaa000 
            "OwnerAccountId": "1111222233333",
            "RouteAnalysisId": "a1873de1-273c-470c-1a2bc2345678",
            "StartTimestamp": 1695760154.0,
            "Status": "RUNNING",
            "Source": {
                "TransitGatewayAttachmentArn": "arn:aws:ec2:us-east-1:111122223333:transit-gateway-attachment/tgw-attach-1234567890abcdef0,
                "TransitGatewayArn": "arn:aws:ec2:us-east-1:111122223333:transit-gateway/tgw-abcdef01234567890",
                "IpAddress": "10.0.0.0"
            },
            "Destination": {
                "TransitGatewayAttachmentArn": "arn:aws:ec2:us-west-1:555555555555:transit-gateway-attachment/tgw-attach-021345abcdef6789",
                "TransitGatewayArn": "arn:aws:ec2:us-west-1:111122223333:transit-gateway/tgw-09876543210fedcba0",
                "IpAddress": "11.0.0.0"
            },
            "IncludeReturnPath": true,
            "UseMiddleboxes": false
        }
    }

For more information, see `Route Analyzer <https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html>`__ in the *AWS Global Networks for Transit Gateways User Guide*.