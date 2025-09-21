**To get a queue URL**

This example gets the specified queue's URL.

Command::

  aws sqs get-queue-url --queue-name MyQueue

Output::

  {
    "QueueUrl": "https://queue.amazonaws.com/80398EXAMPLE/MyQueue"
  }