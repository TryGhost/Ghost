**To wait until the password data for a Windows instance is available**

The following ``wait password-data-available`` example pauses and resumes running only after it confirms that the password data for the specified Windows instance is available. It produces no output. ::

    aws ec2 wait password-data-available \
        --instance-id i-1234567890abcdef0
