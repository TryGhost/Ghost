The following command creates a pre-paid shipping label for the specified job::

  aws importexport get-shipping-label --job-ids EX1ID --name "Jane Roe" --company "Example Corp." --phone-number "206-555-1111" --country "USA" --state-or-province "WA" --city "Anytown" --postal-code "91011-1111" --street-1 "123 Any Street"

The output for the get-shipping-label command looks like the following::

  https://s3.amazonaws.com/amzn-s3-demo-bucket/shipping-label-EX1ID.pdf

The link in the output contains the pre-paid shipping label generated in a PDF. It also contains shipping instructions with a unique bar code to identify and authenticate your device. For more information about using the pre-paid shipping label and shipping your device, see `Shipping Your Storage Device`_ in the *AWS Import/Export Developer Guide*.

.. _`Shipping Your Storage Device`: http://docs.aws.amazon.com/AWSImportExport/latest/DG/CHAP_ShippingYourStorageDevice.html
