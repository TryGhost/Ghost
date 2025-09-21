**To list get details on a specified trusted IP set**

The following ``get-ip-set`` example shows the status and details of the specified trusted IP set. ::

    aws guardduty get-ip-set \
        --detector-id 12abc34d567e8fa901bc2d34eexample \
        --ip-set-id d4b94fc952d6912b8f3060768example

Output::

    {
        "Status": "ACTIVE",
        "Location": "s3://amzn-s3-demo-bucket.s3-us-west-2.amazonaws.com/customlist.csv",
        "Tags": {},
        "Format": "TXT",
        "Name": "test-ip-set-example"
    }
    
For more information, see `Working with Trusted IP Lists and Threat Lists <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload_lists.html>`__ in the *GuardDuty User Guide*.
