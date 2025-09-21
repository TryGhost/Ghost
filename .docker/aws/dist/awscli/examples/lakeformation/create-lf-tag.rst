**To create LF-Tag**

The following ``create-lf-tag`` example creates an LF-Tag with the specified name and values. ::

    aws lakeformation create-lf-tag \
        --catalog-id '123456789111' \
        --tag-key 'usergroup' \
        --tag-values '["developer","analyst","campaign"]' 

This command produces no output.

For more information, see `Managing LF-Tags for metadata access control <https://docs.aws.amazon.com/lake-formation/latest/dg/managing-tags.html>`__ in the *AWS Lake Formation Developer Guide*.
