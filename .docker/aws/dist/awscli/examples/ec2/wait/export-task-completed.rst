**To pause running until an export task is completed**

The following ``wait export-task-completed`` example pauses and continues only after it can confirm that the specified export task is completed. ::

  aws ec2 wait export-task-completed \
      --export-task-ids export-i-fgelt0i7

This command produces no output.
