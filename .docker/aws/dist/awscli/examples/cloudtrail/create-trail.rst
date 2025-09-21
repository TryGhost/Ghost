**To create a trail**

The following ``create-trail`` example creates a multi-region trail named ``Trail1`` and specifies an S3 bucket. ::

    aws cloudtrail create-trail \
        --name Trail1 \
        --s3-bucket-name amzn-s3-demo-bucket \
        --is-multi-region-trail

Output::

    {
        "IncludeGlobalServiceEvents": true, 
        "Name": "Trail1", 
        "TrailARN": "arn:aws:cloudtrail:us-west-2:123456789012:trail/Trail1", 
        "LogFileValidationEnabled": false, 
        "IsMultiRegionTrail": true, 
        "S3BucketName": "amzn-s3-demo-bucket"
    }
