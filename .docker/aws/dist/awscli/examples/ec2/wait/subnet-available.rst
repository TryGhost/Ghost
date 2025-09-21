**To wait until a subnet is available**

The following ``wait subnet-available`` example pauses and resumes running only after it confirms that the specified subnet is available. It produces no output. ::

    aws ec2 wait subnet-available \
        --subnet-ids subnet-1234567890abcdef0
