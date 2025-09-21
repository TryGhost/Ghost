The following command initiates a job to get an inventory of the vault ``my-vault``::

  aws glacier initiate-job --account-id - --vault-name my-vault --job-parameters '{"Type": "inventory-retrieval"}'

Output::

  {
      "location": "/0123456789012/vaults/my-vault/jobs/zbxcm3Z_3z5UkoroF7SuZKrxgGoDc3RloGduS7Eg-RO47Yc6FxsdGBgf_Q2DK5Ejh18CnTS5XW4_XqlNHS61dsO4CnMW",
      "jobId": "zbxcm3Z_3z5UkoroF7SuZKrxgGoDc3RloGduS7Eg-RO47Yc6FxsdGBgf_Q2DK5Ejh18CnTS5XW4_XqlNHS61dsO4CnMW"
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.

The following command initiates a job to retrieve an archive from the vault ``my-vault``::

  aws glacier initiate-job --account-id - --vault-name my-vault --job-parameters file://job-archive-retrieval.json

``job-archive-retrieval.json`` is a JSON file in the local folder that specifies the type of job, archive ID, and some optional parameters::

  {
    "Type": "archive-retrieval",
    "ArchiveId": "kKB7ymWJVpPSwhGP6ycSOAekp9ZYe_--zM_mw6k76ZFGEIWQX-ybtRDvc2VkPSDtfKmQrj0IRQLSGsNuDp-AJVlu2ccmDSyDUmZwKbwbpAdGATGDiB3hHO0bjbGehXTcApVud_wyDw",
    "Description": "Retrieve archive on 2015-07-17",
    "SNSTopic": "arn:aws:sns:us-west-2:0123456789012:my-topic"
  }

Archive IDs are available in the output of ``aws glacier upload-archive`` and ``aws glacier get-job-output``.

Output::

  {
      "location": "/011685312445/vaults/mwunderl/jobs/l7IL5-EkXyEY9Ws95fClzIbk2O5uLYaFdAYOi-azsX_Z8V6NH4yERHzars8wTKYQMX6nBDI9cMNHzyZJO59-8N9aHWav",
      "jobId": "l7IL5-EkXy2O5uLYaFdAYOiEY9Ws95fClzIbk-azsX_Z8V6NH4yERHzars8wTKYQMX6nBDI9cMNHzyZJO59-8N9aHWav"
  }

See `Initiate Job`_ in the *Amazon Glacier API Reference* for details on the job parameters format.

.. _`Initiate Job`: http://docs.aws.amazon.com/amazonglacier/latest/dev/api-initiate-job-post.html