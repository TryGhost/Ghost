# Ghost, Node.js, and Ghost-CLI compatibility

Ghost, Node.js, and Ghost-CLI have independent release cycles. This reference
records the points where their supported version ranges changed.

Use the versions pinned in [`.nvmrc`](../../.nvmrc) and
[`package.json`](../../ghost/core/package.json) when working on the current
Ghost codebase. Use this history when maintaining or upgrading an older Ghost
installation.

There are two different compatibility relationships:

- Ghost's `engines.node` and `engines.cli` fields define the Node.js versions
  that can run that Ghost release and the minimum Ghost-CLI version it accepts.
- Ghost-CLI's own `engines.node` field defines the Node.js versions that can run
  that Ghost-CLI release.

## Ghost compatibility

Rows record compatibility changes and useful final-version milestones. A blank
Node.js or Ghost-CLI cell means that value did not change in that release.

| Release date | Ghost release | Node.js support                        | Minimum Ghost-CLI | Change                                         |
| ------------ | ------------- | -------------------------------------- | ----------------- | ---------------------------------------------- |
| 2017-12-05   | >= 1.18.3     | `^4.5.0 \|\| ^6.9.0 \|\| ^8.9.0`       |                   |                                                |
| 2018-04-17   | >= 1.22.3     |                                        | `^1.7.0`          | Added Ghost-CLI compatibility requirement      |
| 2018-05-04   | >= 1.22.5     | `^6.9.0 \|\| ^8.9.0`                   |                   | Removed Node.js 4                              |
| 2018-07-24   | 1.25.0        |                                        |                   | Last 1.x migrations                            |
| 2019-12-18   | 1.26.2        |                                        |                   | Last 1.x version                               |
| 2018-08-16   | 2.0.0         |                                        | `^1.9.0`          | Initial 2.x support                            |
| 2018-10-30   | >= 2.4.0      | `^6.9.0 \|\| ^8.9.0 \|\| ^10.12.0`     |                   | Added Node.js 10                               |
| 2018-11-07   | >= 2.5.0      | `^6.9.0 \|\| ^8.9.0 \|\| ^10.13.0`     |                   | Bumped Node.js 10 minimum                      |
| 2019-06-04   | >= 2.23.2     | `^8.9.0 \|\| ^10.13.0`                 |                   | Removed Node.js 6                              |
| 2019-07-16   | >= 2.25.7     | `^8.10.0 \|\| ^10.13.0`                |                   | Bumped Node.js 8 minimum                       |
| 2019-10-14   | 2.37.0        |                                        |                   | Last 2.x migrations                            |
| 2021-01-29   | 2.38.3        |                                        |                   | Last 2.x version                               |
| 2019-10-22   | 3.0.0         | `^8.16.0 \|\| ^10.13.0 \|\| ^12.10.0`  | `^1.12.0`         | Initial 3.x support; added Node.js 12          |
| 2020-03-02   | >= 3.9.0      | `^10.13.0 \|\| ^12.10.0`               |                   | Removed Node.js 8                              |
| 2020-11-03   | >= 3.37.0     | `^10.13.0 \|\| ^12.10.0 \|\| ^14.15.0` |                   | Added Node.js 14                               |
| 2021-01-26   | 3.41.0        |                                        |                   | Last 3.x migrations                            |
| 2022-01-22   | 3.42.9        |                                        |                   | Last 3.x version                               |
| 2021-03-15   | 4.0.0         |                                        | `^1.16.0`         | Initial 4.x support                            |
| 2021-05-11   | >= 4.5.0      | `^12.22.1 \|\| ^14.16.1`               | `^1.17.0`         | Removed Node.js 10                             |
| 2021-10-29   | >= 4.21.0     | `^12.22.1 \|\| ^14.17.0 \|\| ^16.13.0` |                   | Added Node.js 16                               |
| 2022-04-22   | >= 4.45.0     | `^14.17.0 \|\| ^16.13.0`               |                   | Removed Node.js 12                             |
| 2022-05-23   | 5.0.0         | `^14.17.0 \|\| ^16.13.0`               | `^1.17.0`         | Initial 5.x support                            |
| 2022-12-02   | >= 5.25.0     | `^14.17.0 \|\| ^16.13.0 \|\| ^18.0.0`  |                   | Added Node.js 18                               |
| 2023-01-05   | >= 5.27.0     | `^14.18.0 \|\| ^16.13.0 \|\| ^18.12.1` |                   | Bumped Node.js 14 and 18 minimums              |
| 2023-05-05   | >= 5.47.0     | `^16.13.0 \|\| ^18.12.1`               |                   | Removed Node.js 14                             |
| 2023-07-14   | >= 5.54.1     | `^16.14.0 \|\| ^18.12.1`               |                   | Bumped Node.js 16 minimum                      |
| 2023-10-04   | >= 5.67.0     |                                        | `^1.25.0`         | Bumped Ghost-CLI minimum                       |
| 2023-10-27   | >= 5.71.0     | `^18.12.1`                             |                   | Removed Node.js 16                             |
| 2024-04-19   | >= 5.82.3     | `^18.12.1 \|\| ^20.11.1`               | `^1.26.0`         | Added Node.js 20 and bumped Ghost-CLI minimum  |
| 2025-02-21   | >= 5.110.0    | `^18.12.1 \|\| ^20.11.1 \|\| ^22.13.1` | `^1.27.0`         | Added Node.js 22 and bumped Ghost-CLI minimum  |
| 2025-08-04   | 6.0.0         | `^22.13.1`                             | `^1.27.0`         | Initial 6.x support; removed Node.js 18 and 20 |
| 2026-04-13   | >= 6.29.0     |                                        | `^1.29.1`         | Bumped Ghost-CLI minimum                       |
| 2026-06-19   | >= 6.46.0     | `^22.18.0`                             |                   | Bumped Node.js 22 minimum                      |
| 2026-07-17   | >= 6.53.0     | `^22.23.1`                             |                   | Bumped Node.js 22 minimum                      |

## Ghost-CLI Node.js compatibility

This table describes the Node.js runtime required to execute Ghost-CLI. It is
separate from the minimum Ghost-CLI version accepted by Ghost above.

| Release date | Ghost-CLI release | Node.js support                                                                 | Change                                                        |
| ------------ | ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2017-07-22   | 1.0.0             | `^4.5.0 \|\| ^6.5.0`                                                            | Initial 1.x support                                           |
| 2017-10-09   | 1.1.3             | `^4.5.0 \|\| ^6.9.0`                                                            | Bumped Node.js 6 minimum                                      |
| 2017-10-30   | 1.2.0             | `^4.5.0 \|\| ^6.9.0 \|\| ^8.8.0`                                                | Added Node.js 8                                               |
| 2017-11-10   | 1.2.1             | `^4.5.0 \|\| ^6.9.0 \|\| ^8.9.0`                                                | Bumped Node.js 8 minimum                                      |
| 2018-05-01   | 1.7.2             | `^6.9.0 \|\| ^8.9.0`                                                            | Removed Node.js 4                                             |
| 2018-10-30   | 1.9.7             | `^6.9.0 \|\| ^8.9.0 \|\| ^10.12.0`                                              | Added Node.js 10                                              |
| 2018-11-07   | 1.9.8             | `^6.9.0 \|\| ^8.9.0 \|\| ^10.13.0`                                              | Bumped Node.js 10 minimum                                     |
| 2019-10-21   | 1.12.0            | `^8.16.0 \|\| ^10.13.0 \|\| ^12.10.0`                                           | Added Node.js 12; removed Node.js 6; bumped Node.js 8 minimum |
| 2021-03-01   | 1.16.0            | `^10.13.0 \|\| ^12.10.0 \|\| ^14.15.0`                                          | Added Node.js 14; removed Node.js 8                           |
| 2021-10-28   | 1.18.0            | `^12.22.1 \|\| ^14.17.0 \|\| ^16.13.0`                                          | Added Node.js 16; removed Node.js 10; bumped minimums         |
| 2022-12-02   | 1.24.0            | `^12.22.1 \|\| ^14.17.0 \|\| ^16.13.0 \|\| ^18.0.0`                             | Added Node.js 18                                              |
| 2024-03-19   | 1.26.0            | `^12.22.1 \|\| ^14.17.0 \|\| ^16.13.0 \|\| ^18.0.0 \|\| ^20.11.1`               | Added Node.js 20                                              |
| 2025-02-13   | 1.27.0            | `^12.22.1 \|\| ^14.17.0 \|\| ^16.13.0 \|\| ^18.0.0 \|\| ^20.11.1 \|\| ^22.11.0` | Added Node.js 22                                              |
| 2026-03-23   | 1.28.6            | `^20.11.1 \|\| ^22.11.0 \|\| ^24.0.0`                                           | Added Node.js 24; removed Node.js 12, 14, 16, and 18          |
| 2026-07-09   | 1.30.0            | `^22.13.0 \|\| ^24.0.0`                                                         | Removed Node.js 20; bumped Node.js 22 minimum                 |
