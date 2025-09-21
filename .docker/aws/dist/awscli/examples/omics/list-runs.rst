**To get a list of workflow runs**

The following ``list-runs`` example gets a list of workflow runs. ::

    aws omics list-runs

Output::

    {
        "items": [
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:run/1234567",
                "creationTime": "2022-12-02T23:20:01.202074Z",
                "id": "1234567",
                "name": "cram-to-bam",
                "priority": 1,
                "startTime": "2022-12-02T23:29:18.115Z",
                "status": "COMPLETED",
                "stopTime": "2022-12-02T23:57:54.428812Z",
                "storageCapacity": 10,
                "workflowId": "1234567"
            },
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:run/1234567",
                "creationTime": "2022-12-03T00:16:57.180066Z",
                "id": "1234567",
                "name": "cram-to-bam",
                "priority": 1,
                "startTime": "2022-12-03T00:26:50.233Z",
                "status": "FAILED",
                "stopTime": "2022-12-03T00:37:21.451340Z",
                "storageCapacity": 10,
                "workflowId": "1234567"
            },
            {
                "arn": "arn:aws:omics:us-west-2:123456789012:run/1234567",
                "creationTime": "2022-12-05T17:57:08.444817Z",
                "id": "1234567",
                "name": "cram-to-bam",
                "status": "STARTING",
                "workflowId": "1234567"
            }
        ]
    }

For more information, see `Run lifecycle in a workflow <https://docs.aws.amazon.com/omics/latest/dev/monitoring-runs.html>`__ in the *AWS HealthOmics User Guide*.
