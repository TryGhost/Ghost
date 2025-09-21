**To list experiment templates**

The following ``list-experiment-templates`` example lists the experiment templates in your AWS account. ::

    aws fis list-experiment-templates

Output::

    {
        "experimentTemplates": [
            {
                "id": "ABCDE1fgHIJkLmNop",
                "description": "myExperimentTemplate",
                "creationTime": 1616017191.124,
                "lastUpdateTime": 1616017191.124,
                "tags": {
                    "key": "value"
                }
            }
        ]
    }

For more information, see `Experiment templates <https://docs.aws.amazon.com/fis/latest/userguide/experiment-templates.html>`__ in the *AWS Fault Injection Simulator User Guide*.
