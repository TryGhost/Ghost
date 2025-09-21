**To wait until a store image task is completed**

The following ``wait store-image-task-complete`` example pauses and resumes after the store image task for the specified image is completed. ::

    aws ec2 wait store-image-task-complete \
        --image-ids ami-1234567890abcdef0

This command produces no output.

For more information, see `Store and restore an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-store-restore.html>`__ in the *Amazon EC2 User Guide*.