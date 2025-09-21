**To send a message**

This example sends a message with the specified message body, delay period, and message attributes, to the specified queue.

Command::

  aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --message-body "Information about the largest city in Any Region." --delay-seconds 10 --message-attributes file://send-message.json

Input file (send-message.json)::

  {
    "City": {
      "DataType": "String",
      "StringValue": "Any City"
    },
    "Greeting": {
      "DataType": "Binary",
      "BinaryValue": "Hello, World!"
    },
    "Population": {
      "DataType": "Number",
      "StringValue": "1250800"
    }
  }

Output::

  {
    "MD5OfMessageBody": "51b0a325...39163aa0",
    "MD5OfMessageAttributes": "00484c68...59e48f06",
    "MessageId": "da68f62c-0c07-4bee-bf5f-7e856EXAMPLE"
  }


