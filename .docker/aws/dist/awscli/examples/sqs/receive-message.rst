**To receive a message**

This example receives up to 10 available messages, returning all available attributes.

Command::

  aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --attribute-names All --message-attribute-names All --max-number-of-messages 10 

Output::

  {
    "Messages": [
      {
        "Body": "My first message.",
        "ReceiptHandle": "AQEBzbVv...fqNzFw==",
        "MD5OfBody": "1000f835...a35411fa",
        "MD5OfMessageAttributes": "9424c491...26bc3ae7",
        "MessageId": "d6790f8d-d575-4f01-bc51-40122EXAMPLE",
        "Attributes": {
          "ApproximateFirstReceiveTimestamp": "1442428276921",
          "SenderId": "AIDAIAZKMSNQ7TEXAMPLE",
          "ApproximateReceiveCount": "5",
          "SentTimestamp": "1442428276921"
        },
        "MessageAttributes": {
          "PostalCode": {
            "DataType": "String",
            "StringValue": "ABC123"
          },
          "City": {
            "DataType": "String",
            "StringValue": "Any City"
          }
        }
      }
    ]
  }
  
This example receives the next available message, returning only the SenderId and SentTimestamp attributes as well as the PostalCode message attribute.

Command::

  aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --attribute-names SenderId SentTimestamp --message-attribute-names PostalCode 

Output::

  {
    "Messages": [
      {
        "Body": "My first message.",
        "ReceiptHandle": "AQEB6nR4...HzlvZQ==",
        "MD5OfBody": "1000f835...a35411fa",
        "MD5OfMessageAttributes": "b8e89563...e088e74f",
        "MessageId": "d6790f8d-d575-4f01-bc51-40122EXAMPLE",
        "Attributes": {
          "SenderId": "AIDAIAZKMSNQ7TEXAMPLE",
          "SentTimestamp": "1442428276921"
        },
        "MessageAttributes": {
          "PostalCode": {
            "DataType": "String",
            "StringValue": "ABC123"
          }
        }
      }
    ]
  }