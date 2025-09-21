**To create and activate a trusted IP set**

The following ``create-ip-set`` example creates and activates a trusted IP set in the current Region. ::

    aws guardduty create-ip-set \
        --detector-id 12abc34d567e8fa901bc2d34eexample \ 
        --name new-ip-set-example \
        --format TXT \
        --location s3://amzn-s3-demo-bucket/customtrustlist.csv \
        --activate

Output::

    {
        "IpSetId": "d4b94fc952d6912b8f3060768example"
    }

For more information, see `Working with Trusted IP Lists and Threat Lists <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload_lists.html>`__ in the *GuardDuty User Guide*.