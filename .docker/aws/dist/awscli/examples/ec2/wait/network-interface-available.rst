**To wait until a network interface is available**

The following ``wait network-interface-available`` example pauses and resumes running only after it confirms that the specified network interface is available. It produces no output. ::

    aws ec2 wait network-interface-available \
        --network-interface-ids eni-1234567890abcdef0
