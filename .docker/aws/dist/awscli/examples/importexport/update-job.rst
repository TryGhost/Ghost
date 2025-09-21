The following command updates the specified job::

  aws importexport update-job --job-id EX1ID --job-type import --manifest file://manifest.txt --no-validate-only

The output for the update-jobs command looks like the following::

  True    **** Device will be erased before being returned. ****

With this command, you can either modify the original manifest you submitted, or you can start over and create a new manifest file. In either case, the original manifest is discarded.
