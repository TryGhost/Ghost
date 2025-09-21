**To view a run group**

The following ``get-run-group`` example gets details about a run group. ::

    aws omics get-run-group \
        --id 1234567

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:runGroup/1234567",
        "creationTime": "2022-12-01T00:58:42.915219Z",
        "id": "1234567",
        "maxCpus": 20,
        "maxDuration": 600,
        "name": "cram-convert",
        "tags": {}
    }

For more information, see `Creating run groups <https://docs.aws.amazon.com/omics/latest/dev/creating-run-groups.html>`__ in the *AWS HealthOmics User Guide*.