import * as fs from 'fs-extra'
import * as glob from 'glob'
import {promisify} from 'util'
import {DOMParser} from 'xmldom'

// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import {DangerDSLType} from "../node_modules/danger/distribution/dsl/DangerDSL"
declare var danger: DangerDSLType
export declare function message(message: string): void
export declare function warn(message: string): void
export declare function fail(message: string): void
export declare function markdown(message: string): void

interface JUnitReportOptions {
	/**
	 * The path to the generated junit files.
	 */
	pathToReports?: string
}
/**
 * Add your Junit XML test failures to Danger
 */
export default async function junit(options: JUnitReportOptions) {
	const currentPath: string = options.pathToReport !== undefined ? options.pathToReport! : "./build/reports/**/TESTS*.xml"
	// Use glob to find xml reports!
	const matches: string[] = await promisify(glob)(currentPath);
	if (matches.length === 0) {
		return;
	}
	// Give details on failed mocha suite tests
	const failed = await Promise.all(matches.map(m => gatherFailedTestcases(m)));
	// flatten all the results into one array
	const failures_and_errors = failed.reduce((acc, val) => acc.concat(val), []);
	if (failures_and_errors.length === 0) {
		return;
	}

	fail('Tests have failed, see below for more information.');
	let message = '### Tests: \n\n';
	const keys = Array.from(failures_and_errors[0].attributes).map(attr => attr.nodeName);
	const attributes = keys.map(key => {
		return key.substr(0, 1).toUpperCase() + key.substr(1).toLowerCase();
	});
	attributes.push('Error');

	// TODO Include stderr/stdout too?
	// Create the headers
	message += '| ' + attributes.join(' | ') + ' |\n';
	message += '| ' + attributes.map(() => '---').join(' | ') + ' |\n';

	// Map out the keys to the tests
	failures_and_errors.forEach(test => {
		const row_values = keys.map(key => test.getAttribute(key));
		// push error/failure message too
		const errors = test.getElementsByTagName('error');
		if (errors.length !== 0) {
			row_values.push(errors.item(0).getAttribute('message') + errors.item(0).getAttribute('stack'));
		} else {
			const failures = test.getElementsByTagName('failure');
			if (failures.length !== 0) {
				row_values.push(failures.item(0).getAttribute('message') + failures.item(0).getAttribute('stack'));
			} else {
				row_values.push(''); // This shouldn't ever happen
			}
		}
		message += '| ' + row_values.join(' | ') + ' |\n';
	});

	markdown(message);
}


// Report test failures
async function gatherFailedTestcases(reportPath) {
	const exists = await fs.pathExists(reportPath);
	if (!exists) {
		return [];
	}
	const contents = await fs.readFile(reportPath, 'utf8');
	const doc = new DOMParser().parseFromString(contents, 'text/xml');
	const suite_root = doc.documentElement.firstChild.tagName === 'testsuites' ? doc.documentElement.firstChild : doc.documentElement;
	const suites = Array.from(suite_root.getElementsByTagName('testsuite'));

	// We need to get the 'testcase' elements that have an 'error' or 'failure' child node
	const failed_suites = suites.filter(suite => {
		const hasFailures = suite.hasAttribute('failures') && parseInt(suite.getAttribute('failures')) !== 0;
		const hasErrors = suite.hasAttribute('errors') && parseInt(suite.getAttribute('errors')) !== 0;
		return hasFailures || hasErrors;
	});
	// Gather all the testcase nodes from each failed suite properly.
	let failed_suites_all_tests = [];
	failed_suites.forEach(function (suite) {
		failed_suites_all_tests = failed_suites_all_tests.concat(Array.from(suite.getElementsByTagName('testcase')));
	});
	return failed_suites_all_tests.filter(function (test) {
		return test.hasChildNodes() && (test.getElementsByTagName('failure').length > 0 || test.getElementsByTagName('error').length > 0);
	});
}
