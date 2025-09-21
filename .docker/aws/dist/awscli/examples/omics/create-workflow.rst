**To create a workflow**

The following ``create-workflow`` example creates a WDL workflow. ::

    aws omics create-workflow \
        --name cram-converter \
        --engine WDL \
        --definition-zip fileb://workflow-crambam.zip \
        --parameter-template file://workflow-params.json

``workflow-crambam.zip`` is a ZIP archive containing a workflow definition. ``workflow-params.json`` defines runtime parameters for the workflow. ::

    {
        "ref_fasta" : { 
            "description": "Reference genome fasta file",
            "optional": false
        },
        "ref_fasta_index" : { 
            "description": "Index of the reference genome fasta file",
            "optional": false
        },
        "ref_dict" : { 
            "description": "dictionary file for 'ref_fasta'",
            "optional": false
        },
        "input_cram" : { 
            "description": "The Cram file to convert to BAM",
            "optional": false
        },
        "sample_name" : { 
            "description": "The name of the input sample, used to name the output BAM",
            "optional": false
        }
    }

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:workflow/1234567",
        "id": "1234567",
        "status": "CREATING",
        "tags": {}
    }

For more information, see `Creating private workflows <https://docs.aws.amazon.com/omics/latest/dev/workflows-setup.html>`__ in the *AWS HealthOmics User Guide*.
