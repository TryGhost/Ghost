**To list all cost allocation tags for a queue**

The following ``list-queue-tags`` example displays all of the cost allocation tags associated with the specified queue. ::

    aws sqs list-queue-tags \
        --queue-url https://sqs.us-west-2.amazonaws.com/123456789012/MyQueue

Output::

    {
        "Tags": {
            "Team": "Alpha"
        }
    }

For more information, see `Listing Cost Allocation Tags <https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-tags.html>`__ in the *Amazon Simple Queue Service Developer Guide*.
