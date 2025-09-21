**To wait until a customer gateway is available**

The following ``wait customer-gateway-available`` example pauses and resumes running only after it confirms that the specified customer gateway is available. It produces no output. ::

    aws ec2 wait customer-gateway-available \
        --customer-gateway-ids cgw-1234567890abcdef0
