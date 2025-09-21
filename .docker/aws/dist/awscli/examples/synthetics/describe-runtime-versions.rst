**To return a list of synthetics canary runtime versions**

The following ``describe-runtime-versions`` example returns the list of synthetics canary runtime versions. ::

    aws synthetics describe-runtime-versions

Output::

    {
        "RuntimeVersions": [
            {
                "VersionName": "syn-nodejs-puppeteer-9.1",
                "Description": "Security fixes and bug fix for date range error in har. Dependencies: Node JS 20.x, Puppeteer-core 22.12.1, Chromium 126.0.6478.126",
                "ReleaseDate": "2024-10-02T05:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-9.0",
                "Description": "Upgraded Chromium and Puppeteer. Dependencies: Node JS 20.x, Puppeteer-core 22.12.1, Chromium 126.0.6478.126",
                "ReleaseDate": "2024-07-22T05:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-8.0",
                "Description": "Upgraded Chromium and Puppeteer. Dependencies: Node JS 20.x, Puppeteer-core 22.10.0, Chromium 125.0.6422.112",
                "ReleaseDate": "2024-06-21T05:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-7.0",
                "Description": "Upgraded Chromium and Puppeteer. Dependencies: Node JS 18.x, Puppeteer-core 21.9.0, Chromium 121.0.6167.139",
                "ReleaseDate": "2024-03-08T05:30:00+05:30"
                },
            {
                "VersionName": "syn-nodejs-puppeteer-6.2",
                "Description": "Updated shared libraries for Chromium and added ephemeral storage monitoring. Dependencies: Node JS 18.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2024-02-02T05:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-6.1",
                "Description": "Added puppeteer launch retry. Dependencies: Node JS 18.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2023-11-13T05:30:00+05:30",
                "DeprecationDate": "2024-03-08T13:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-6.0",
                "Description": "Reduced X-Ray traces of a canary run, improved duration metric and upgraded to NodeJS 18.x. Dependencies: Node JS 18.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2023-09-15T05:30:00+05:30",
                "DeprecationDate": "2024-03-08T13:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-5.2",
                "Description": "Updated shared libraries for Chromium. Dependencies: Node JS 16.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2024-02-01T05:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-5.1",
                "Description": "Fixes a bug about missing request headers in har. Dependencies: Node JS 16.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2023-08-09T05:30:00+05:30",
                "DeprecationDate": "2024-03-08T13:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-5.0",
                "Description": "Upgraded Puppeteer and Chromium. Dependencies: Node JS 16.x, Puppeteer-core 19.7.0, Chromium 111.0.5563.146",
                "ReleaseDate": "2023-07-21T05:30:00+05:30",
                "DeprecationDate": "2024-03-08T13:30:00+05:30"
            },
            {
                "VersionName": "syn-nodejs-puppeteer-4.0",
                "Description": "Upgraded to NodeJS 16.x. Dependencies: Node JS 16.x, Puppeteer-core 5.5.0, Chromium 92.0.4512.0",
                "ReleaseDate": "2023-05-01T05:30:00+05:30",
                "DeprecationDate": "2024-03-08T13:30:00+05:30"
            }
        ]
    }

For more information, see `Synthetic monitoring (canaries) <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html>`__ in the *Amazon CloudWatch User Guide*.