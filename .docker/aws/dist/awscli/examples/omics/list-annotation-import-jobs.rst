**To get a list of annotation import jobs**

The following ``list-annotation-import-jobs`` gets a list of annotation import jobs. ::

    aws omics list-annotation-import-jobs

Output::

    {
        "annotationImportJobs": [
            {
                "creationTime": "2022-11-30T01:39:41.478294Z",
                "destinationName": "gff_ann_store",
                "id": "18a9e792-xmpl-4869-a105-e5b602900444",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "runLeftNormalization": false,
                "status": "COMPLETED",
                "updateTime": "2022-11-30T01:47:09.145178Z"
            },
            {
                "creationTime": "2022-11-30T00:45:58.007838Z",
                "destinationName": "my_ann_store",
                "id": "4e9eafc8-xmpl-431e-a0b2-3bda27cb600a",
                "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
                "runLeftNormalization": false,
                "status": "FAILED",
                "updateTime": "2022-11-30T00:47:01.706325Z"
            }
        ]
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
