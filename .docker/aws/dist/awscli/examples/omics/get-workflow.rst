**To view a workflow**

The following ``get-workflow`` example gets details about a workflow with ID ``1234567``. ::

    aws omics get-workflow \
        --id 1234567

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:workflow/1234567",
        "creationTime": "2022-11-30T22:33:16.225368Z",
        "digest": "sha256:c54bxmpl742dcc26f7fa1f10e37550ddd8f251f418277c0a58e895b801ed28cf",
        "engine": "WDL",
        "id": "1234567",
        "main": "workflow-crambam.wdl",
        "name": "cram-converter",
        "parameterTemplate": {
            "ref_dict": {
                "description": "dictionary file for 'ref_fasta'"
            },
            "ref_fasta_index": {
                "description": "Index of the reference genome fasta file"
            },
            "ref_fasta": {
                "description": "Reference genome fasta file"
            },
            "input_cram": {
                "description": "The Cram file to convert to BAM"
            },
            "sample_name": {
                "description": "The name of the input sample, used to name the output BAM"
            }
        },
        "status": "ACTIVE",
        "statusMessage": "workflow-crambam.wdl\n    workflow CramToBamFlow\n        call CramToBamTask\n        call ValidateSamFile\n    task CramToBamTask\n    task ValidateSamFile\n",
        "tags": {},
        "type": "PRIVATE"
    }

For more information, see `Creating private workflows <https://docs.aws.amazon.com/omics/latest/dev/workflows-setup.html>`__ in the *AWS HealthOmics User Guide*.
