The following command retrieves the notification configuration for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-bucket-notification --bucket amzn-s3-demo-bucket

Output::

  {
      "TopicConfiguration": {
          "Topic": "arn:aws:sns:us-west-2:123456789012:my-notification-topic",
          "Id": "YmQzMmEwM2EjZWVlI0NGItNzVtZjI1MC00ZjgyLWZDBiZWNl",
          "Event": "s3:ObjectCreated:*",
          "Events": [
              "s3:ObjectCreated:*"
          ]
      }
  }
