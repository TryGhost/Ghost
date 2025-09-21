**To wait until an instance exists**

The following ``wait instance-exists`` example pauses and resumes running only after it confirms that the specified instance exists. It produces no output. ::

  aws ec2 wait instance-exists \
    --instance-ids i-1234567890abcdef0
