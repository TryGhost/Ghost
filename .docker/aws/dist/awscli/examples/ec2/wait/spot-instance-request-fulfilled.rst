**To wait until an Spot Instance request is fulfilled**

The following ``wait spot-instance-request-fulfilled`` example pauses and resumes running only after it confirms that a Spot Instance request is fulfilled in the specified Availability Zone. It produces no output. ::

    aws ec2 wait spot-instance-request-fulfilled \
        --filters Name=launched-availability-zone,Values=us-east-1
