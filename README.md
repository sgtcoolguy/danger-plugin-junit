# danger-plugin-junit

[![Build Status](https://travis-ci.org/sgtcoolguy/danger-plugin-junit.svg?branch=master)](https://travis-ci.org/sgtcoolguy/danger-plugin-junit)
[![npm version](https://badge.fury.io/js/danger-plugin-junit.svg)](https://badge.fury.io/js/danger-plugin-junit)


> Add your Junit XML test failures to Danger

## Usage

Install:

```sh
npm install danger-plugin-junit --save-dev
# or
yarn add danger-plugin-junit --dev
```

At a glance:

```js
// dangerfile.js
import junit from 'danger-plugin-junit'

async function main() {
	await junit({ pathToReport: './build/reports/**/TESTS*.xml' })
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		fail(err.toString());
		process.exit(1);
	});
```

The default `pathToReport` value is `'./build/reports/**/TESTS*.xml'`
The value is a [glob](https://www.npmjs.com/package/glob) string to gather up test result files.

This plugin will only report test failures and errors. If any tests fail, it will report a single `fail()` message and record a table of the failed tests using `markdown()`.

An example of what is produced is below:
![](junit_results.png)

## Changelog

See the GitHub [release history](https://github.com/sgtcoolguy/danger-plugin-junit/releases).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
