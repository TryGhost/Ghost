**To accept a share of analytics store data**

The following ``accept-share`` example accepts a share of HealthOmics analytics store data. ::

    aws omics accept-share \
        ----share-id "495c21bedc889d07d0ab69d710a6841e-dd75ab7a1a9c384fa848b5bd8e5a7e0a"

Output::

    {
        "status": "ACTIVATING"
    }

For more information, see `Cross-account sharing <https://docs.aws.amazon.com/omics/latest/dev/cross-account-sharing.html>`__ in the *AWS HealthOmics User Guide*.