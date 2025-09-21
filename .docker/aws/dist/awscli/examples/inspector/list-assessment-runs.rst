**To list assessment runs**

The following ``list-assessment-runs`` command lists all existing assessment runs. ::

    aws inspector list-assessment-runs

Output::

    {
        "assessmentRunArns": [
            "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE",
            "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-v5D6fI3v"
        ]
    }

For more information, see `Amazon Inspector Assessment Templates and Assessment Runs <https://docs.aws.amazon.com/inspector/latest/userguide/inspector_assessments.html>`_ in the *Amazon Inspector User Guide*.
