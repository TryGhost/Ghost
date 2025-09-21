**To list experiments**

The following ``list-experiments`` example lists the experiments in your AWS account. ::

    aws fis list-experiments

Output::

    {
        "experiments": [
            {
                "id": "ABCdeF1GHiJkLM23NO",
                "experimentTemplateId": "ABCDE1fgHIJkLmNop",
                "state": {
                    "status": "running",
                    "reason": "Experiment is running."
                },
                "creationTime": 1616017341.197,
                "tags": {
                "key": "value"
                }
            }
        ]
    }

For more information, see `Experiments <https://docs.aws.amazon.com/fis/latest/userguide/experiments.html>`__ in the *AWS Fault Injection Simulator User Guide*.
