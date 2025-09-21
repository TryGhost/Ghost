**To delete a share of HealthOmics analytics data**

The following ``delete-share`` example deletes a cross-account share of analytics data. ::

    aws omics delete-share \
        --share-id "495c21bedc889d07d0ab69d710a6841e-dd75ab7a1a9c384fa848b5bd8e5a7e0a" 

Output::

    {
        "status": "DELETING"
    }

For more information, see `Cross-account sharing <https://docs.aws.amazon.com/omics/latest/dev/cross-account-sharing.html>`__ in the *AWS HealthOmics User Guide*.