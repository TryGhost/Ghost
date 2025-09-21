**To remove cost allocation tags from a queue**

The following ``untag-queue`` example removes a cost allocation tag from the specified Amazon SQS queue. ::

    aws sqs untag-queue \
        --queue-url https://sqs.us-west-2.amazonaws.com/123456789012/MyQueue \
        --tag-keys "Priority"

This command produces no output.

For more information, see `Adding Cost Allocation Tags <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-tags.html>`__ in the *Amazon Simple Queue Service Developer Guide*.
