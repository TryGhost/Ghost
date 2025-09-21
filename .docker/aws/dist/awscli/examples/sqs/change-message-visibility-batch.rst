**To change multiple messages' timeout visibilities as a batch**

This example changes the 2 specified messages' timeout visibilities to 10 hours (10 hours * 60 minutes * 60 seconds).

Command::

  aws sqs change-message-visibility-batch --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --entries file://change-message-visibility-batch.json
  
Input file (change-message-visibility-batch.json)::

  [
    {
      "Id": "FirstMessage",
	  "ReceiptHandle": "AQEBhz2q...Jf3kaw==",
	  "VisibilityTimeout": 36000
    },
    {
      "Id": "SecondMessage",
	  "ReceiptHandle": "AQEBkTUH...HifSnw==",
	  "VisibilityTimeout": 36000  
    }
  ]

Output::

  {
    "Successful": [
      {
        "Id": "SecondMessage"
      },
      {
        "Id": "FirstMessage"
      }
    ]
  }

