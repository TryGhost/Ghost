**To get a list of workflows**

The following ``list-workflows`` example gets a list of workflows. ::

    aws omics list-workflows

Output::

    {
        "items": [
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:workflow/1234567",
                "creationTime": "2022-09-23T23:08:22.041227Z",
                "digest": "nSCNo/qMWFxmplXpUdokXJnwgneOaxyyc2YOxVxrJTE=",
                "id": "1234567",
                "name": "my-wkflow-0",
                "status": "ACTIVE",
                "type": "PRIVATE"
            },
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:workflow/1234567",
                "creationTime": "2022-11-30T22:33:16.225368Z",
                "digest": "sha256:c54bxmpl742dcc26f7fa1f10e37550ddd8f251f418277c0a58e895b801ed28cf",
                "id": "1234567",
                "name": "cram-converter",
                "status": "ACTIVE",
                "type": "PRIVATE"
            }
        ]
    }

For more information, see `Creating private workflows <https://docs.aws.amazon.com/omics/latest/dev/workflows-setup.html>`__ in the *AWS HealthOmics User Guide*.
