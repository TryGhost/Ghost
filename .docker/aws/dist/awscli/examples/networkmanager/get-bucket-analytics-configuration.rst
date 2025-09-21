**To retrieve the analytics configuration for a bucket with a specific ID**

The following ``get-bucket-analytics-configuration`` example displays the analytics configuration for the specified bucket and ID. ::

    aws s3api get-bucket-analytics-configuration \
        --bucket amzn-s3-demo-bucket \
        --id 1

Output::

   {
       "AnalyticsConfiguration": {
           "StorageClassAnalysis": {},
           "Id": "1"
       }
   }
