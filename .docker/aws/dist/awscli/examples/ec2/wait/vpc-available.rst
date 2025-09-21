**To wait until a virtual private cloud (VPC) is available**

The following ``wait vpc-available`` example pauses and resumes running only after it confirms that the specified VPC is available. It produces no output. ::

    aws ec2 wait vpc-available \
        --vpc-ids vpc-1234567890abcdef0
