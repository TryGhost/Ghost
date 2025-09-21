**To view a read set export job**

The following ``get-read-set-export-job`` example gets details about a read set export job. ::

    aws omics get-read-set-export-job \
        --sequence-store-id 1234567890 \
        --id 1234567890

Output::

    {
        "completionTime": "2022-12-06T22:39:14.491Z",
        "creationTime": "2022-12-06T22:37:18.612Z",
        "destination": "s3://omics-artifacts-01d6xmpl4e72dd32/read-set-export/",
        "id": "1234567890",
        "sequenceStoreId": "1234567890",
        "status": "COMPLETED",
        "statusMessage": "The job is submitted and will start soon."
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
