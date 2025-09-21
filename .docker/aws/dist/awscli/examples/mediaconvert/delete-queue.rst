**To delete a custom on-demand queue**

The following ``delete-queue`` example deletes the specified custom on-demand queue. 

You can't delete your default queue. You can't delete a reserved queue that has an active pricing plan or that contains unprocessed jobs. ::

    aws mediaconvert delete-queue \
        --name Customer1 \
        --endpoint-url https://abcd1234.mediaconvert.us-west-2.amazonaws.com


This command produces no output. Run ``aws mediaconvert list-queues`` to confirm that your queue was deleted.

For more information, see `Working with AWS Elemental MediaConvert Queues <https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-queues.html>`__ in the *AWS Elemental MediaConvert User Guide*.
