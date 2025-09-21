**To wait until a VPC peering connection is deleted**

The following ``wait vpc-peering-connection-deleted`` example pauses and resumes running only after it confirms that the specified VPC peering connection is deleted. It produces no output. ::

    aws ec2 wait vpc-peering-connection-deleted \
        --vpc-peering-connection-ids pcx-1234567890abcdef0
