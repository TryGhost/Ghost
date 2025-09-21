**To pause running until a conversion task is cancelled**

The following ``wait conversion-task-cancelled`` example pauses and continues only after it can confirm that the specified conversion task is cancelled. ::

  aws ec2 wait conversion-task-cancelled \
      --conversion-task-ids import-i-fh95npoc 

This command produces no output.
