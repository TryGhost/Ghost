**To view a workflow run**

The following ``get-run`` example gets details about a workflow run. ::

    aws omics get-run \
        --id 1234567

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:run/1234567",
        "creationTime": "2022-11-30T22:58:22.615865Z",
        "digest": "sha256:c54bxmpl742dcc26f7fa1f10e37550ddd8f251f418277c0a58e895b801ed28cf",
        "id": "1234567",
        "name": "cram-to-bam",
        "outputUri": "s3://omics-artifacts-01d6xmpl4e72dd32/workflow-output/",
        "parameters": {
            "ref_dict": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.dict",
            "ref_fasta_index": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta.fai",
            "ref_fasta": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta",
            "sample_name": "NA12878",
            "input_cram": "s3://omics-artifacts-01d6xmpl4e72dd32/NA12878.cram"
        },
        "resourceDigests": {
            "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta.fai": "etag:f76371b113734a56cde236bc0372de0a",
            "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.dict": "etag:3884c62eb0e53fa92459ed9bff133ae6",
            "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta": "etag:e307d81c605fb91b7720a08f00276842-388",
            "s3://omics-artifacts-01d6xmpl4e72dd32/NA12878.cram": "etag:a9f52976381286c6143b5cc681671ec6"
        },
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "startedBy": "arn:aws:iam::123456789012:user/laptop-2020",
        "status": "STARTING",
        "tags": {},
        "workflowId": "1234567",
        "workflowType": "PRIVATE"
    }

For more information, see `Run lifecycle in a workflow <https://docs.aws.amazon.com/omics/latest/dev/monitoring-runs.html>`__ in the *AWS HealthOmics User Guide*.
