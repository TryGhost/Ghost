**To pause running until the specified cluster instance is deleted**

The following ``wait db-instance-deleted`` command pauses and continues only after it can confirm that the specified database cluster instance is deleted. ::

    aws docdb wait db-instance-deleted \
        --db-instance-identifier "sample-instance"

This command produces no output.
