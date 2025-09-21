**To wait until a key pair exists**

The following ``wait key-pair-exists`` example pauses and resumes running only after it confirms that the specified key pair exists. It produces no output. ::

    aws ec2 wait key-pair-exists \
        --key-names my-key-pair
