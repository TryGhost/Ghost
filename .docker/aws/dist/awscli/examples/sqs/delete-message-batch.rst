**To delete multiple messages as a batch**

This example deletes the specified messages.

Command::

  aws sqs delete-message-batch --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --entries file://delete-message-batch.json

Input file (delete-message-batch.json)::

  [
    {
	  "Id": "FirstMessage",
	  "ReceiptHandle": "AQEB1mgl...Z4GuLw=="
    },
    {
      "Id": "SecondMessage",
	  "ReceiptHandle": "AQEBLsYM...VQubAA=="
    }
  ]

Output::

  {
    "Successful": [
      {
        "Id": "FirstMessage"
      },
      {
        "Id": "SecondMessage"
      }
    ]
  }