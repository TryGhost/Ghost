**To create a run group**

The following ``create-run-group`` example creates a run group named ``cram-converter``. ::

    aws omics create-run-group \
        --name cram-converter \
        --max-cpus 20 \
        --max-gpus 10 \
        --max-duration 600 \
        --max-runs 5 

Output::

    {
        "arn": "arn:aws:omics:us-west-2:123456789012:runGroup/1234567",
        "id": "1234567",
        "tags": {}
    }

For more information, see `Creating run groups <https://docs.aws.amazon.com/omics/latest/dev/creating-run-groups.html>`__ in the *AWS HealthOmics User Guide*.
