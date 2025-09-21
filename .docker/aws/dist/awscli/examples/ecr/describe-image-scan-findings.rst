**To describe the scan findings for an image**

The following ``describe-image-scan-findings`` example returns the image scan findings for an image using the image digest in the specified repository in the default registry for an account. ::

    aws ecr describe-image-scan-findings \
        --repository-name sample-repo \
        --image-id imageDigest=sha256:74b2c688c700ec95a93e478cdb959737c148df3fbf5ea706abe0318726e885e6

Output::

    {
        "imageScanFindings": {
          "findings": [
              {
                  "name": "CVE-2019-5188",
                  "description": "A code execution vulnerability exists in the directory rehashing functionality of E2fsprogs e2fsck 1.45.4. A specially crafted ext4 directory can cause an out-of-bounds write on the stack, resulting in code execution. An attacker can corrupt a partition to trigger this vulnerability.",
                  "uri": "http://people.ubuntu.com/~ubuntu-security/cve/CVE-2019-5188",
                  "severity": "MEDIUM",
                  "attributes": [
                      {
                          "key": "package_version",
                          "value": "1.44.1-1ubuntu1.1"
                      },
                      {
                          "key": "package_name",
                          "value": "e2fsprogs"
                      },
                      {
                          "key": "CVSS2_VECTOR",
                          "value": "AV:L/AC:L/Au:N/C:P/I:P/A:P"
                      },
                      {
                          "key": "CVSS2_SCORE",
                          "value": "4.6"
                      }
                  ]
              }
          ],
          "imageScanCompletedAt": 1579839105.0,
          "vulnerabilitySourceUpdatedAt": 1579811117.0,
          "findingSeverityCounts": {
              "MEDIUM": 1
          }
      },
      "registryId": "123456789012",
      "repositoryName": "sample-repo",
      "imageId": {
          "imageDigest": "sha256:74b2c688c700ec95a93e478cdb959737c148df3fbf5ea706abe0318726e885e6"
      },
      "imageScanStatus": {
          "status": "COMPLETE",
          "description": "The scan was completed successfully."
      }
    }

For more information, see `Image Scanning <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html>`__ in the *Amazon ECR User Guide*.
