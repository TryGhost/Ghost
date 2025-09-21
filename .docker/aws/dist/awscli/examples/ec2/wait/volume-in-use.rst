**To wait until a volume is in use**

The following ``wait volume-in-use`` example pauses and resumes running only after it confirms that the specified volume is in use. It produces no output. ::

    aws ec2 wait volume-in-use \
        --volume-ids vol-1234567890abcdef0
