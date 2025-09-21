The following command applies a tagging configuration to a bucket named ``amzn-s3-demo-bucket``::

  aws s3api put-bucket-tagging --bucket amzn-s3-demo-bucket --tagging file://tagging.json

The file ``tagging.json`` is a JSON document in the current folder that specifies tags::

  {
     "TagSet": [
       {
         "Key": "organization",
         "Value": "marketing"
       }
     ]
  }

Or apply a tagging configuration to ``amzn-s3-demo-bucket`` directly from the command line::

  aws s3api put-bucket-tagging --bucket amzn-s3-demo-bucket --tagging 'TagSet=[{Key=organization,Value=marketing}]'
