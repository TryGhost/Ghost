The applies a notification configuration to a bucket named ``amzn-s3-demo-bucket``::

  aws s3api put-bucket-notification --bucket amzn-s3-demo-bucket --notification-configuration file://notification.json

The file ``notification.json`` is a JSON document in the current folder that specifies an SNS topic and an event type to monitor::

  {
    "TopicConfiguration": {
      "Event": "s3:ObjectCreated:*",
      "Topic": "arn:aws:sns:us-west-2:123456789012:s3-notification-topic"
    }
  }

The SNS topic must have an IAM policy attached to it that allows Amazon S3 to publish to it::

  {
   "Version": "2008-10-17",
   "Id": "example-ID",
   "Statement": [
    {
     "Sid": "example-statement-ID",
     "Effect": "Allow",
     "Principal": {
       "Service": "s3.amazonaws.com"  
     },
     "Action": [
      "SNS:Publish"
     ],
     "Resource": "arn:aws:sns:us-west-2:123456789012:amzn-s3-demo-bucket",
     "Condition": {
        "ArnLike": {          
        "aws:SourceArn": "arn:aws:s3:*:*:amzn-s3-demo-bucket"    
      }
     }
    }
   ]
  }