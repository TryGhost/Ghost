**To export an instance**

This example command creates a task to export the instance i-1234567890abcdef0 to the Amazon S3 bucket
myexportbucket.

Command::

  aws ec2 create-instance-export-task --description "RHEL5 instance" --instance-id i-1234567890abcdef0 --target-environment vmware --export-to-s3-task DiskImageFormat=vmdk,ContainerFormat=ova,S3Bucket=myexportbucket,S3Prefix=RHEL5

Output::

  {
      "ExportTask": {
          "State": "active",
          "InstanceExportDetails": {
              "InstanceId": "i-1234567890abcdef0",
              "TargetEnvironment": "vmware"
          },
          "ExportToS3Task": {
              "S3Bucket": "myexportbucket",
              "S3Key": "RHEL5export-i-fh8sjjsq.ova",
              "DiskImageFormat": "vmdk",
              "ContainerFormat": "ova"
          },
          "Description": "RHEL5 instance",
          "ExportTaskId": "export-i-fh8sjjsq"
      }
  }
