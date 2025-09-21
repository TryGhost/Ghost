**To send multiple messages as a batch**

This example sends 2 messages with the specified message bodies, delay periods, and message attributes, to the specified queue.

Command::

  aws sqs send-message-batch --queue-url https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue --entries file://send-message-batch.json 
  
Input file (send-message-batch.json)::

  [
    {
      "Id": "FuelReport-0001-2015-09-16T140731Z",
	  "MessageBody": "Fuel report for account 0001 on 2015-09-16 at 02:07:31 PM.",
	  "DelaySeconds": 10,
	  "MessageAttributes": {
	    "SellerName": {
	      "DataType": "String",
		  "StringValue": "Example Store"
        },
	    "City": {
          "DataType": "String",
          "StringValue": "Any City"
        },
	    "Region": {
	      "DataType": "String", 
		  "StringValue": "WA"
        },
	    "PostalCode": {
	      "DataType": "String",
		  "StringValue": "99065"
	    },
	    "PricePerGallon": {
	      "DataType": "Number",
		  "StringValue": "1.99"
        }
	  }
    },
    {
      "Id": "FuelReport-0002-2015-09-16T140930Z",
	  "MessageBody": "Fuel report for account 0002 on 2015-09-16 at 02:09:30 PM.",
	  "DelaySeconds": 10,
	  "MessageAttributes": {
	    "SellerName": {
	      "DataType": "String",
		  "StringValue": "Example Fuels"
        },
	    "City": {
          "DataType": "String",
          "StringValue": "North Town"
        },
	    "Region": {
	      "DataType": "String", 
		  "StringValue": "WA"
        },
	    "PostalCode": {
	      "DataType": "String",
		  "StringValue": "99123"
	    },
	    "PricePerGallon": {
	      "DataType": "Number",
		  "StringValue": "1.87"
        }
	  }
    }
  ]

Output::

  {
    "Successful": [
      {
        "MD5OfMessageBody": "203c4a38...7943237e",
        "MD5OfMessageAttributes": "10809b55...baf283ef",
        "Id": "FuelReport-0001-2015-09-16T140731Z",
        "MessageId": "d175070c-d6b8-4101-861d-adeb3EXAMPLE"
      },
      {
        "MD5OfMessageBody": "2cf0159a...c1980595",
        "MD5OfMessageAttributes": "55623928...ae354a25",
        "Id": "FuelReport-0002-2015-09-16T140930Z",
        "MessageId": "f9b7d55d-0570-413e-b9c5-a9264EXAMPLE"
      }
    ]
  }

  
	