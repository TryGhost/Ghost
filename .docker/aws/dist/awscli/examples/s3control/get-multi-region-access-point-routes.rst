**To query the current Multi-Region Access Point route configuration**

The following ``get-multi-region-access-point-routes`` example returns the current routing configuration for the specified Multi-Region Access Point. ::

    aws s3control get-multi-region-access-point-routes \
        --region Region \
        --account-id 111122223333 \
        --mrap MultiRegionAccessPoint_ARN

Output::

    {
        "Mrap": "arn:aws:s3::111122223333:accesspoint/0000000000000.mrap",
        "Routes": [
            {
                "Bucket": "amzn-s3-demo-bucket1",
                "Region": "ap-southeast-2",
                "TrafficDialPercentage": 100
            },
            {
                "Bucket": "amzn-s3-demo-bucket2",
                "Region": "us-west-1",
                "TrafficDialPercentage": 0
            }
        ]
    }