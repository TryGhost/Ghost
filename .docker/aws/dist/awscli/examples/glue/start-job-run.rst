**To start running a job**

The following ``start-job-run`` example starts a job. ::

    aws glue start-job-run \
        --job-name my-job

Output::

    {
        "JobRunId": "jr_22208b1f44eb5376a60569d4b21dd20fcb8621e1a366b4e7b2494af764b82ded"
    }

For more information, see `Authoring Jobs <https://docs.aws.amazon.com/glue/latest/dg/author-job.html>`__ in the *AWS Glue Developer Guide*.
