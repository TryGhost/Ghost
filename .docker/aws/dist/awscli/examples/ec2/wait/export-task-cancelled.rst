**To pause running until an export task is cancelled**

The following ``wait export-task-cancelled`` example pauses and continues only after it can confirm that the specified export task is cancelled. ::

  aws ec2 wait export-task-cancelled \
      --export-task-ids export-i-fgelt0i7

This command produces no output.
