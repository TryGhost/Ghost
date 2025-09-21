**To wait until the status of an instance is OK**

The following ``wait instance-status-ok`` example pauses and resumes running only after it confirms that the status of the specified instance is OK. It produces no output. ::

    aws ec2 wait instance-status-ok \
        --instance-ids i-1234567890abcdef0
