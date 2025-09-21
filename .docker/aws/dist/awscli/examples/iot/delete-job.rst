**To delete a job**

The following ``delete-job`` example deletes the specified job. By specifying the ``--force`` option, the job is deleted even if the status is ``IN_PROGRESS``. ::

    aws iot delete-job \
        --job-id "example-job-04" \
        --force
        
This command produces no output.

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
