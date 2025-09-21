**To update a run group**

The following ``update-run-group`` example updates the settings of a run group with id ``1234567``. ::

    aws omics update-run-group \
        --id 1234567 \
        --max-cpus 10

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:runGroup/1234567",
        "creationTime": "2022-12-01T00:58:42.915219Z",
        "id": "1234567",
        "maxCpus": 10,
        "maxDuration": 600,
        "name": "cram-convert",
        "tags": {}
    }

For more information, see `Omics Workflows <https://docs.aws.amazon.com/omics/latest/dev/workflows.html>`__ in the *Amazon Omics Developer Guide*.
