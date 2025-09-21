**To describe Spot Instance datafeed subscription for an account**

This example command describes the data feed for the account.

Command::

  aws ec2 describe-spot-datafeed-subscription

Output::

  {
      "SpotDatafeedSubscription": {
          "OwnerId": "123456789012",
          "Prefix": "spotdata",
          "Bucket": "amzn-s3-demo-bucket",
          "State": "Active"
      }
  }

