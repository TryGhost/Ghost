**To update a trusted IP set**

The following ``update-ip-set`` example shows how to update the details of a trusted IP set. ::

    aws guardduty update-ip-set \
        --detector-id 12abc34d567e8fa901bc2d34eexample \
        --ip-set-id d4b94fc952d6912b8f3060768example \
        --location https://amzn-s3-demo-bucket.s3-us-west-2.amazonaws.com/customtrustlist2.csv

This command produces no output.

For more information, see `Working with Trusted IP Lists and Threat Lists <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload_lists.html>`__ in the *GuardDuty User Guide*.
