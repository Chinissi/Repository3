---
author: "Sosuke Suzuki (@sosukesuzuki)"
authorURL: "https://github.com/sosukesuzuki"
title: "Prettier 3.0"
---

This version includes breaking changes. For example, the markdown formatting no longer inserts a space between Latin characters and Chinese or Japanese characters! [Tatsunori Uchino](https://github.com/tats-u) has been a great contributor to Prettier for a year for this feature. And the default value of `trailingComma` is now `all`!

In particular, the plugin interface has changed significantly. We now supports plugins written with ECMAScript Modules and async parsers. If you are a plugin developer, please be careful when updating. The migration guide is [here](https://github.com/prettier/prettier/wiki/How-to-migrate-my-plugin-to-support-Prettier-v3%3F). Bug reports and feedback are welcome!

In addition, many formatting improvements and bug fixes are included.

If you enjoy Prettier and would like to support our work, consider sponsoring us directly via [our OpenCollective](https://opencollective.com/prettier) or by sponsoring the projects we depend on, including [typescript-eslint](https://opencollective.com/typescript-eslint), [remark](https://opencollective.com/unified), and [Babel](https://opencollective.com/babel).