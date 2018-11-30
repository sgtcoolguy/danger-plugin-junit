import * as fs from "fs-extra"
import * as glob from "glob"
import { promisify } from "util"
import { DOMParser } from "xmldom"

// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import { DangerDSLType } from "../node_modules/danger/distribution/dsl/DangerDSL"
declare var danger: DangerDSLType
export declare function message(message: string): void
export declare function warn(message: string): void
export declare function fail(message: string): void
export declare function markdown(message: string): void

interface JUnitReportOptions {
  /**
   * The path to the generated junit files.
   */
  pathToReport?: string
}
/**
 * Add your Junit XML test failures to Danger
 */
export default async function junit(options: JUnitReportOptions) {
  const currentPath: string =
    options.pathToReport !== undefined ? options.pathToReport! : "./build/reports/**/TESTS*.xml"
  // Use glob to find xml reports!
  const matches: string[] = await promisify(glob)(currentPath)
  if (matches.length === 0) {
    return
  }
  // Give details on failed mocha suite tests
  const failed = await Promise.all(matches.map(m => gatherFailedTestcases(m)))
  // flatten all the results into one array
  const failuresAndErrors: any[] = failed.reduce((acc, val) => acc.concat(val), [])
  if (failuresAndErrors.length === 0) {
    return
  }

  fail("Tests have failed, see below for more information.")
  let testResultsTable: string = "### Tests:\n\n"
  const keys: string[] = Array.from(failuresAndErrors[0].attributes).map((attr: any) => attr.nodeName)
  const attributes: string[] = keys.map(key => {
    return key.substr(0, 1).toUpperCase() + key.substr(1).toLowerCase()
  })
  attributes.push("Error")

  // TODO Include stderr/stdout too?
  // Create the headers
  testResultsTable += "| " + attributes.join(" | ") + " |\n"
  testResultsTable += "| " + attributes.map(() => "---").join(" | ") + " |\n"

  // Map out the keys to the tests
  failuresAndErrors.forEach(test => {
    const rowValues = keys.map(key => test.getAttribute(key))
    // push error/failure message too
    const errors = test.getElementsByTagName("error")
    if (errors.length !== 0) {
      rowValues.push(errors.item(0).getAttribute("message") + errors.item(0).getAttribute("stack"))
    } else {
      const failures = test.getElementsByTagName("failure")
      if (failures.length !== 0) {
        rowValues.push(failures.item(0).getAttribute("message") + failures.item(0).getAttribute("stack"))
      } else {
        rowValues.push("") // This shouldn't ever happen
      }
    }
    testResultsTable += "| " + rowValues.join(" | ") + " |\n"
  })

  markdown(testResultsTable)
}

// Report test failures
async function gatherFailedTestcases(reportPath) {
  const exists = await fs.pathExists(reportPath)
  if (!exists) {
    return []
  }
  const contents = await fs.readFile(reportPath, "utf8")
  const doc = new DOMParser().parseFromString(contents, "text/xml")
  const suiteRoot =
    doc.documentElement.firstChild.tagName === "testsuites" ? doc.documentElement.firstChild : doc.documentElement
  const suites: any[] = Array.from(suiteRoot.getElementsByTagName("testsuite"))

  // We need to get the 'testcase' elements that have an 'error' or 'failure' child node
  const failedSuites = suites.filter(suite => {
    const hasFailures = suite.hasAttribute("failures") && parseInt(suite.getAttribute("failures"), 10) !== 0
    const hasErrors = suite.hasAttribute("errors") && parseInt(suite.getAttribute("errors"), 10) !== 0
    return hasFailures || hasErrors
  })
  // Gather all the testcase nodes from each failed suite properly.
  let failedSuitesAllTests: any[] = []
  failedSuites.forEach(suite => {
    failedSuitesAllTests = failedSuitesAllTests.concat(Array.from(suite.getElementsByTagName("testcase")))
  })
  return failedSuitesAllTests.filter(test => {
    return (
      test.hasChildNodes() &&
      (test.getElementsByTagName("failure").length > 0 || test.getElementsByTagName("error").length > 0)
    )
  })
}
