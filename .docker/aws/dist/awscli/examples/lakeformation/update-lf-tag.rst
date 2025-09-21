**To update LF-Tag definition**

The following ``update-lf-tag`` example updates LF-Tag definition. ::

    aws lakeformation update-lf-tag \
        --catalog-id '123456789111' \
        --tag-key 'usergroup' \
        --tag-values-to-add '["admin"]' 

This command produces no output.

For more information, see `Managing LF-Tags for metadata access control <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
