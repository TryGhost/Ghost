**To list queues**

This example lists all queues.

Command::

  aws sqs list-queues

Output::

  {
    "QueueUrls": [
      "https://queue.amazonaws.com/80398EXAMPLE/MyDeadLetterQueue",
      "https://queue.amazonaws.com/80398EXAMPLE/MyQueue",
      "https://queue.amazonaws.com/80398EXAMPLE/MyOtherQueue",        
      "https://queue.amazonaws.com/80398EXAMPLE/TestQueue1",
	  "https://queue.amazonaws.com/80398EXAMPLE/TestQueue2"		
    ]
  }

This example lists only queues that start with "My".

Command::

  aws sqs list-queues --queue-name-prefix My

Output::

  {
    "QueueUrls": [
      "https://queue.amazonaws.com/80398EXAMPLE/MyDeadLetterQueue",
      "https://queue.amazonaws.com/80398EXAMPLE/MyQueue",
      "https://queue.amazonaws.com/80398EXAMPLE/MyOtherQueue"	
    ]
  }