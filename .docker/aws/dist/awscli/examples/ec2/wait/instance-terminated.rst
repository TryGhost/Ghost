**To wait until an instance terminates**

The following ``wait instance-terminated`` example pauses and resumes running only after it confirms that the specified instance is terminated. It produces no output. ::

    aws ec2 wait instance-terminated \
        --instance-ids i-1234567890abcdef0
