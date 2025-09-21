**To pause running until a security group exists**

The following ``wait security-group-exists`` example pauses and continues only after it can confirm that the specified security group exists. ::

    aws ec2 wait security-group-exists \
        --group-ids sg-07e789d0fb10492ee

This command produces no output.
