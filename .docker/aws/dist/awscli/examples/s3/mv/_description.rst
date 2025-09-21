Moves a local file or S3 object to another location locally or in S3. 
The ``mv`` command copies the source object or file to the specified 
destination and then deletes the source object or file.

.. WARNING::
    If you are using any type of access point ARNs or access point aliases 
    in your S3 URIs, you must take extra care to make sure that your source 
    and destination S3 URIs resolve to different underlying buckets. If the 
    source and destination buckets are the same, the source file or object 
    can be moved onto itself, which can result in accidental deletion of 
    your source file or object.

    To verify that the source and destination buckets are not the same, 
    use the ``--validate-same-s3-paths`` parameter, or set the environment
    variable ``AWS_CLI_S3_MV_VALIDATE_SAME_S3_PATHS`` to ``true``.