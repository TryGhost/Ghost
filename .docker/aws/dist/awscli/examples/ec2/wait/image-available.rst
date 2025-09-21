**To wait until an image is available**

The following ``wait image-available`` example pauses and resumes running only after it confirms that the specified Amazon Machine Image is available. It produces no output. ::

    aws ec2 wait image-available \
        --image-ids ami-0abcdef1234567890
