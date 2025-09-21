**To create the content of a dataset**

The following ``create-dataset-content`` example creates the content of the specified dataset by applying a ``queryAction`` (an SQL query) or a ``containerAction`` (executing a containerized application). ::

    aws iotanalytics create-dataset-content \
        --dataset-name mydataset

Output::

    {
        "versionId": "d494b416-9850-4670-b885-ca22f1e89d62"
    }

For more information, see `CreateDatasetContent <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_CreateDatasetContent.html>`__ in the *AWS IoT Analytics API Reference*.
