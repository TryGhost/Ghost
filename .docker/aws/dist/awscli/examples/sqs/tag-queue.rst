**To add cost allocation tags to a queue**

The following ``tag-queue`` example adds a cost allocation tag to the specified Amazon SQS queue. ::

    aws sqs tag-queue \
        --queue-url https://sqs.us-west-2.amazonaws.com/123456789012/MyQueue \
        --tags Priority=Highest

This command produces no output.

For more information, see `Adding Cost Allocation Tags <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-tags.html>`__ in the *Amazon Simple Queue Service Developer Guide*.
