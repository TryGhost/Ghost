**To wait until the system status is OK**

The following ``wait system-status-ok`` example command pauses and resumes running only after it confirms that the system status of the specified instance is OK. It produces no output. ::

    aws ec2 wait system-status-ok \
        --instance-ids i-1234567890abcdef0
