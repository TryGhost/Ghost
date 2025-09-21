**To check a drift detection operation's status**

The following ``describe-stack-drift-detection-status`` example displays the status of a drift detection operation. Get the by ID running the ``detect-stack-drift`` command. ::

    aws cloudformation describe-stack-drift-detection-status \
        --stack-drift-detection-id 1a229160-e4d9-xmpl-ab67-0a4f93df83d4

Output::

    {
        "StackId": "arn:aws:cloudformation:us-west-2:123456789012:stack/my-stack/d0a825a0-e4cd-xmpl-b9fb-061c69e99204",
        "StackDriftDetectionId": "1a229160-e4d9-xmpl-ab67-0a4f93df83d4",
        "StackDriftStatus": "DRIFTED",
        "DetectionStatus": "DETECTION_COMPLETE",
        "DriftedStackResourceCount": 1,
        "Timestamp": "2019-10-02T05:54:30.902Z"
    }
