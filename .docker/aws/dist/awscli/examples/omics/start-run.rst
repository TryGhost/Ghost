**To run a workflow**

The following ``start-run`` example runs a workflow with ID ``1234567``. ::

    aws omics start-run \
        --workflow-id 1234567 \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ \
        --name 'cram-to-bam' \
        --output-uri s3://omics-artifacts-01d6xmpl4e72dd32/workflow-output/ \
        --run-group-id 1234567 \
        --priority 1 \
        --storage-capacity 10 \
        --log-level ALL \
        --parameters file://workflow-inputs.json

`workflow-inputs.json` is a JSON document with the following content. ::

    {
        "sample_name": "NA12878",
        "input_cram": "s3://omics-artifacts-01d6xmpl4e72dd32/NA12878.cram",
        "ref_dict": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.dict",
        "ref_fasta": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta",
        "ref_fasta_index": "omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.fasta.fai"
    }

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:run/1234567",
        "id": "1234567",
        "status": "PENDING",
        "tags": {}
    }

For more information, see `Starting a run <https://docs.aws.amazon.com/omics/latest/dev/starting-a-run.html>`__ in the *AWS HealthOmics User Guide*.

**To load source files from Amazon Omics**

You can also load source files from Amazon Omics storage, by using service-specific URIs. The following example `workflow-inputs.json` file uses Amazon Omics URIs for read set and reference genome sources. ::

    {
        "sample_name": "NA12878",
        "input_cram": "omics://123456789012.storage.us-west-2.amazonaws.com/1234567890/readSet/1234567890/source1",
        "ref_dict": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.dict",
        "ref_fasta": "omics://123456789012.storage.us-west-2.amazonaws.com/1234567890/reference/1234567890",
        "ref_fasta_index": "omics://123456789012.storage.us-west-2.amazonaws.com/1234567890/reference/1234567890/index"
    }

