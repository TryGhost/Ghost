**To create an SNS topic**

The following ``create-topic`` example creates an SNS topic named ``my-topic``. ::

    aws sns create-topic \
        --name my-topic

Output::

    {
        "ResponseMetadata": {
            "RequestId": "1469e8d7-1642-564e-b85d-a19b4b341f83"
        },
        "TopicArn": "arn:aws:sns:us-west-2:123456789012:my-topic"
    }

For more information, see `Using the AWS Command Line Interface with Amazon SQS and Amazon SNS <https://docs.aws.amazon.com/cli/latest/userguide/cli-sqs-queue-sns-topic.html>`__ in the *AWS Command Line Interface User Guide*.