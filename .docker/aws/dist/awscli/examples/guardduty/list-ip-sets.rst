**To list trusted IP sets in the current region**

The following ``list-ip-sets`` example lists the trusted IP sets in your current AWS region. ::

    aws guardduty list-ip-sets \
        --detector-id 12abc34d567e8fa901bc2d34eexample 

Output::

    {
        "IpSetIds": [
            "d4b94fc952d6912b8f3060768example"
        ]
    }
    
For more information, see `Working with Trusted IP Lists and Threat Lists <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload_lists.html>`__ in the GuardDuty User Guide.