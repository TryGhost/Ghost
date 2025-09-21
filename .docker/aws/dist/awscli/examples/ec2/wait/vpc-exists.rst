**To wait until a virtual private cloud (VPC) exists**

The following ``wait vpc-exists`` example command pauses and resumes running only after it confirms that the specified VPC exists. ::

    aws ec2 wait vpc-exists \
        --vpc-ids vpc-1234567890abcdef0
