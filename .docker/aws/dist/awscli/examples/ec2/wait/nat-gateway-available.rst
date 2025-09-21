**To wait until a NAT gateway is available**

The following ``wait nat-gateway-available`` example pauses and resumes running only after it confirms that the specified NAT gateway is available. It produces no output. ::

    aws ec2 wait nat-gateway-available \
        --nat-gateway-ids nat-1234567890abcdef0
