**To list your SNS topics**

The following ``list-topics`` example lists all of SNS topics in your AWS account. ::

  aws sns list-topics

Output::

    {
        "Topics": [
            {
                "TopicArn": "arn:aws:sns:us-west-2:123456789012:my-topic"
            }
        ]
    }
