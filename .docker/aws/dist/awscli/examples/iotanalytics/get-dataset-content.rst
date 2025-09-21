**To retrieve the contents of a dataset**

The following ``get-dataset-content`` example retrieves the contents of a dataset as presigned URIs. ::

    aws iotanalytics get-dataset-content --dataset-name mydataset

Output::

    {
        "status": {
            "state": "SUCCEEDED"
        },
        "timestamp": 1557863215.995,
        "entries": [
            {
                "dataURI": "https://aws-radiant-dataset-12345678-1234-1234-1234-123456789012.s3.us-west-2.amazonaws.com/results/12345678-e8b3-46ba-b2dd-efe8d86cf385.csv?X-Amz-Security-Token=...-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20190628T173437Z&X-Amz-SignedHeaders=host&X-Amz-Expires=7200&X-Amz-Credential=...F20190628%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Signature=..."
            }
        ]
    }

For more information, see `GetDatasetContent <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_GetDatasetContent.html>`__ in the *guide*.
