**To create a Spot Instance data feed**

The following ``create-spot-datafeed-subscription`` example creates a Spot Instance data feed. ::

    aws ec2 create-spot-datafeed-subscription \
        --bucket amzn-s3-demo-bucket \
        --prefix spot-data-feed

Output::

    {
        "SpotDatafeedSubscription": {
            "Bucket": "amzn-s3-demo-bucket",
            "OwnerId": "123456789012",
            "Prefix": "spot-data-feed",
            "State": "Active"
        }
    }

The data feed is stored in the Amazon S3 bucket that you specified. The file names for this data feed have the following format. ::

    amzn-s3-demo-bucket.s3.amazonaws.com/spot-data-feed/123456789012.YYYY-MM-DD-HH.n.abcd1234.gz

For more information, see `Spot Instance data feed <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-data-feeds.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.
