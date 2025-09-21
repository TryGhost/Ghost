**To wait until an instance is stopped**

The following ``wait instance-stopped`` example pauses and resumes running only after it confirms that the specified instance is stopped. It produces no output. ::

    aws ec2 wait instance-stopped \
        --instance-ids i-1234567890abcdef0
