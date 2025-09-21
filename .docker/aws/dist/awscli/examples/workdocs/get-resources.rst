**To retrieve shared resources**

The following ``get-resources`` example retrieves the resources shared with the specified Amazon WorkDocs user. ::

    aws workdocs get-resources \
        --user-id "S-1-1-11-1111111111-2222222222-3333333333-3333" \
        --collection-type SHARED_WITH_ME

Output::

    {
    "Folders": [],
    "Documents": []
    }

For more information, see `Sharing Files and Folders <https://docs.aws.amazon.com/workdocs/latest/userguide/share-docs.html>`__ in the *Amazon WorkDocs User Guide*.
