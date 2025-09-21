**To update a trail**

The following ``update-trail`` example updates a trail to use an existing bucket for log delivery. ::

    aws cloudtrail update-trail \
        --name Trail1 \
        --s3-bucket-name amzn-s3-demo-bucket

Output::

    {
        "IncludeGlobalServiceEvents": true, 
        "Name": "Trail1", 
        "TrailARN": "arn:aws:cloudtrail:us-west-2:123456789012:trail/Trail1", 
        "LogFileValidationEnabled": false, 
        "IsMultiRegionTrail": true, 
        "S3BucketName": "amzn-s3-demo-bucket"
    }
