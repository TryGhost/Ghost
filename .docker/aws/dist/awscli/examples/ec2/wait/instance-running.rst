**To wait until an instance is running**

The following ``wait instance-running`` example pauses and resumes running only after it confirms that the specified instance is running. It produces no output. ::

    aws ec2 wait instance-running \
        --instance-ids i-1234567890abcdef0
