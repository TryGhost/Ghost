**To wait until a snapshot is completed**

The following ``wait snapshot-completed`` example pauses and resumes running only after it confirms that the specified snapshot is completed. It produces no output. ::

    aws ec2 wait snapshot-completed \
        --snapshot-ids snap-1234567890abcdef0
