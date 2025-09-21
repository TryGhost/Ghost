**To create and activate a new threat intel set**

The following ``create-threat-intel-set`` example creates and activates a threat intel set in the current Region. ::

    aws guardduty create-threat-intel-set \
        --detector-id b6b992d6d2f48e64bc59180bfexample \
        --name myThreatSet-example \
        --format TXT \
        --location s3://amzn-s3-demo-bucket/threatlist.csv \
        --activate 

Output::

    {
        "ThreatIntelSetId": "20b9a4691aeb33506b808878cexample"
    }

For more information, see `Working with Trusted IP Lists and Threat Lists <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload_lists.html>`__ in the *GuardDuty User Guide*.
