The following command retrieves the notification configuration for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-bucket-notification-configuration --bucket amzn-s3-demo-bucket

Output::

  {
      "TopicConfigurations": [
          {
              "Id": "YmQzMmEwM2EjZWVlI0NGItNzVtZjI1MC00ZjgyLWZDBiZWNl",
              "TopicArn": "arn:aws:sns:us-west-2:123456789012:my-notification-topic",
              "Events": [
                  "s3:ObjectCreated:*"
              ]
          }
      ]
  }
