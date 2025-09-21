**To delete a job execution**

The following ``delete-job-execution`` example deletes the job execution of the specified job on a device. Use ``describe-job-execution`` to get the execution number. ::

    aws iot delete-job-execution 
        --job-id "example-job-02" 
        --thing-name "MyRaspberryPi"  
        --execution-number 1

This command produces no output.

For more information, see `Creating and Managing Jobs (CLI) <https://docs.aws.amazon.com/iot/latest/developerguide/manage-job-cli.html>`__ in the *AWS IoT Developer Guide*.
