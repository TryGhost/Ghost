**To list dead letter source queues**

This example lists the queues that are associated with the specified dead letter source queue.

Command::

  aws sqs list-dead-letter-source-queues --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyDeadLetterQueue

Output::

  {
    "queueUrls": [
      "https://queue.amazonaws.com/80398EXAMPLE/MyQueue",
      "https://queue.amazonaws.com/80398EXAMPLE/MyOtherQueue"
    ]
  }