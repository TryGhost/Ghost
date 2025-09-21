**To delete a job**

The following ``delete-job`` example deletes a job that is no longer needed. ::

    aws glue delete-job \
        --job-name my-testing-job

Output::

    {
        "JobName": "my-testing-job"
    }

For more information, see `Working with Jobs on the AWS Glue Console <https://docs.aws.amazon.com/glue/latest/dg/console-jobs.html>`__ in the *AWS Glue Developer Guide*.
