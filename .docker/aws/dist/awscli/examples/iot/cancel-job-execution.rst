**To cancel a job execution on a device**

The following ``cancel-job-execution`` example cancels the execution of the specified job on a device.  If the job is not in the ``QUEUED`` state, you must add the ``--force`` parameter. ::

    aws iot cancel-job-execution \
        --job-id "example-job-03" \
        --thing-name "MyRPi"
        
This command produces no output.

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
