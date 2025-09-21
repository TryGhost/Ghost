**To pause running until a conversion task is deleted**

The following ``wait conversion-task-deleted`` example pauses and continues only after it can confirm that the specified conversion task is deleted. ::

  aws ec2 wait conversion-task-deleted \
      --conversion-task-ids import-i-fh95npoc

This command produces no output.
