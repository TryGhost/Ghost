**To get a list of variant import jobs**

The following ``list-variant-import-jobs`` example gets a list of variant import jobs. ::

    aws omics list-variant-import-jobs

Output::

    {
        "variantImportJobs": [
            {
                "creationTime": "2022-11-23T22:47:02.514002Z",
                "destinationName": "my_var_store",
                "id": "69cb65d6-xmpl-4a4a-9025-4565794b684e",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "runLeftNormalization": false,
                "status": "COMPLETED",
                "updateTime": "2022-11-23T22:49:17.976597Z"
            },
            {
                "creationTime": "2022-11-23T22:42:50.037812Z",
                "destinationName": "my_var_store",
                "id": "edd7b8ce-xmpl-47e2-bc99-258cac95a508",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "runLeftNormalization": false,
                "status": "COMPLETED",
                "updateTime": "2022-11-23T22:45:26.009880Z"
            }
        ]
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
