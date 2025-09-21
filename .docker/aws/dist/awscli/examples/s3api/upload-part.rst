The following command uploads the first part in a multipart upload initiated with the ``create-multipart-upload`` command::

  aws s3api upload-part --bucket amzn-s3-demo-bucket --key 'multipart/01' --part-number 1 --body part01 --upload-id  "dfRtDYU0WWCCcH43C3WFbkRONycyCpTJJvxu2i5GYkZljF.Yxwh6XG7WfS2vC4to6HiV6Yjlx.cph0gtNBtJ8P3URCSbB7rjxI5iEwVDmgaXZOGgkk5nVTW16HOQ5l0R"

The ``body`` option takes the name or path of a local file for upload (do not use the file:// prefix). The minimum part size is 5 MB. Upload ID is returned by ``create-multipart-upload`` and can also be retrieved with ``list-multipart-uploads``. Bucket and key are specified when you create the multipart upload.

Output::

  {
      "ETag": "\"e868e0f4719e394144ef36531ee6824c\""
  }

Save the ETag value of each part for later. They are required to complete the multipart upload.