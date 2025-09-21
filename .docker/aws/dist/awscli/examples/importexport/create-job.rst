The following command creates an import job from a manifest file::

  aws importexport create-job --job-type import --manifest file://manifest --no-validate-only

The file ``manifest`` is a YAML formatted text file in the current directory with the following content::

  manifestVersion: 2.0;
  returnAddress:
  name: Jane Roe
  company: Example Corp.
  street1: 123 Any Street
  city: Anytown
  stateOrProvince: WA
  postalCode: 91011-1111
  phoneNumber: 206-555-1111
  country: USA
  deviceId: 49382
  eraseDevice: yes
  notificationEmail: john.doe@example.com;jane.roe@example.com
  bucket: amzn-s3-demo-bucket

For more information on the manifest file format, see `Creating Import Manifests`_ in the *AWS Import/Export Developer Guide*.

.. _`Creating Import Manifests`: http://docs.aws.amazon.com/AWSImportExport/latest/DG/ImportManifestFile.html
  
You can also pass the manifest as a string in quotes::

  aws importexport create-job --job-type import --manifest 'manifestVersion: 2.0;
   returnAddress:
   name: Jane Roe
   company: Example Corp.
   street1: 123 Any Street
   city: Anytown
   stateOrProvince: WA
   postalCode: 91011-1111
   phoneNumber: 206-555-1111
   country: USA
   deviceId: 49382
   eraseDevice: yes
   notificationEmail: john.doe@example.com;jane.roe@example.com
   bucket: amzn-s3-demo-bucket'

For information on quoting string arguments and using files, see `Specifying Parameter Values`_ in the *AWS CLI User Guide*.

.. _`Specifying Parameter Values`: http://docs.aws.amazon.com/cli/latest/userguide/cli-using-param.html
