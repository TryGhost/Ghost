**To export a read set**

The following ``start-read-set-export-job`` example exports two read sets to Amazon S3. ::

    aws omics start-read-set-export-job \
        --sequence-store-id 1234567890 \
        --sources readSetId=1234567890 readSetId=1234567890 \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ
 \
        --destination s3://omics-artifacts-01d6xmpl4e72dd32/read-set-export/

Output::

    {
        "creationTime": "2022-12-06T22:37:18.612Z",
        "destination": "s3://omics-artifacts-01d6xmpl4e72dd32/read-set-export/",
        "id": "1234567890",
        "sequenceStoreId": "1234567890",
        "status": "SUBMITTED"
    }

For more information, see `Omics Storage <https://docs.aws.amazon.com/omics/latest/dev/sequence-stores.html>`__ in the *Amazon Omics Developer Guide*.
