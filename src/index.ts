import * as fs from "fs-extra"
import * as glob from "glob"
import { inspect, promisify } from "util"
import { DOMParser } from "xmldom"

// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import { DangerDSLType } from "../node_modules/danger/distribution/dsl/DangerDSL"
declare var danger: DangerDSLType
export declare function message(message: string): void
export declare function warn(message: string): void
export declare function fail(message: string): void
export declare function markdown(message: string): void

interface Attribute {
  nodeName: string
}

interface Element {
  attributes: Attribute[]
  firstChild: Element
  nodeValue: string
  hasAttribute(name: string): boolean
  getAttribute(name: string): string
  getElementsByTagName(name: string): ElementList
  hasChildNodes(): boolean
}

interface ElementList {
  readonly length: number
  item(index: number): Element
  [index: number]: Element
}

interface JUnitReportOptions {
  /**
   * The path to the generated junit files.
   */
  pathToReport?: string
  /**
   * Whether the test summary message will be reported using danger's `message()`. Defaults to true.
   */
  showMessageTestSummary?: boolean
}

/**
 * Add your Junit XML test failures to Danger
 */
export default async function junit(options: JUnitReportOptions) {
  const currentPath: string =
    options.pathToReport !== undefined ? options.pathToReport! : "./build/reports/**/TESTS*.xml"
  const shouldShowMessageTestSummary: boolean =
    options.showMessageTestSummary !== undefined ? options.showMessageTestSummary! : true

  // Use glob to find xml reports!
  const matches: string[] = await promisify(glob)(currentPath)
  if (matches.length === 0) {
    warn(`:mag: Can't find junit reports at \`${currentPath}\`, skipping generating JUnit Report.`)
    return
  }

  // Gather all the suites up
  const allSuites = await Promise.all(matches.map(m => gatherSuites(m)))
  const suites: Element[] = allSuites.reduce((acc, val) => acc.concat(val), [])

  // Give a summary message
  if (shouldShowMessageTestSummary) {
    reportSummary(suites)
  }

  // Give details on failed tests
  const failuresAndErrors: Element[] = gatherFailedTestcases(suites)
  if (failuresAndErrors.length !== 0) {
    reportFailures(failuresAndErrors)
  }
}

function gatherErrorDetail(failure: Element): string {
  let detail = "<pre>"
  if (failure.hasAttribute("type") && failure.getAttribute("type") !== "") {
    detail += `${failure.getAttribute("type")}: `
  }
  if (failure.hasAttribute("message")) {
    detail += failure.getAttribute("message")
  }
  if (failure.hasAttribute("stack")) {
    detail += "\n" + failure.getAttribute("stack")
  }
  if (failure.hasChildNodes()) {
    // CDATA stack trace
    detail +=
      "\n" +
      failure.firstChild.nodeValue
        .trim()
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
  }
  detail += "</pre>"
  return detail
}

function reportFailures(failuresAndErrors: Element[]): void {
  fail("Tests have failed, see below for more information.")
  let testResultsTable: string = "### Tests:\n\n<table>"
  const keys: string[] = Array.from(failuresAndErrors[0].attributes).map((attr: Attribute) => attr.nodeName)
  const attributes: string[] = keys.map(key => {
    return key.substr(0, 1).toUpperCase() + key.substr(1).toLowerCase()
  })
  // TODO: Force order? Classname, name, time
  attributes.push("Error")

  // TODO Include stderr/stdout too?
  // Create the headers
  testResultsTable += `<tr><th>${attributes.join("</th><th>")}</th></tr>\n`

  // Map out the keys to the tests
  failuresAndErrors.forEach(test => {
    const rowValues = keys.map(key => test.getAttribute(key))
    // push error/failure message too
    const errors = test.getElementsByTagName("error")
    if (errors.length !== 0) {
      rowValues.push(gatherErrorDetail(errors.item(0)))
    } else {
      const failures = test.getElementsByTagName("failure")
      if (failures.length !== 0) {
        rowValues.push(gatherErrorDetail(failures.item(0)))
      } else {
        rowValues.push("") // This shouldn't ever happen
      }
    }
    testResultsTable += `<tr><td>${rowValues.join("</td><td>")}</td></tr>\n`
  })
  testResultsTable += `</table>\n`

  markdown(testResultsTable)
}

function reportSummary(suites: Element[]): void {
  const results = {
    count: 0,
    failures: 0,
    skipped: 0,
  }
  // for each test suite, look at:
  // tests="19" failures="1" skipped="3" timestamp="" time="6.487">
  // FIXME: Sometimes these numbers look "suspect" and may be reporting incorrect numbers versus the actual contents...
  suites.forEach(s => {
    results.count += s.hasAttribute("tests") ? parseInt(s.getAttribute("tests"), 10) : 0
    results.failures += s.hasAttribute("failures") ? parseInt(s.getAttribute("failures"), 10) : 0
    results.failures += s.hasAttribute("errors") ? parseInt(s.getAttribute("errors"), 10) : 0
    results.skipped += s.hasAttribute("skipped") ? parseInt(s.getAttribute("skipped"), 10) : 0
  })

  if (results.failures !== 0) {
    message(`:x: ${results.failures} tests have failed
There are ${results.failures} tests failing and ${results.skipped} skipped out of ${results.count} total tests.`)
  } else {
    let msg = `:white_check_mark: All tests are passing
Nice one! All ${results.count} tests are passing.`
    if (results.skipped !== 0) {
      msg += `\n(There are ${results.skipped} tests skipped)`
    }
    message(msg)
  }
}

async function gatherSuites(reportPath: string): Promise<Element[]> {
  const exists = await fs.pathExists(reportPath)
  if (!exists) {
    return []
  }
  const contents = await fs.readFile(reportPath, "utf8")
  const doc = new DOMParser().parseFromString(contents, "text/xml")
  const suiteRoot =
    doc.documentElement.firstChild.tagName === "testsuites" ? doc.documentElement.firstChild : doc.documentElement
  return suiteRoot.tagName === "testsuite" ? [suiteRoot] : Array.from(suiteRoot.getElementsByTagName("testsuite"))
}

// Report test failures
function gatherFailedTestcases(suites: Element[]): Element[] {
  // We need to get the 'testcase' elements that have an 'error' or 'failure' child node
  const failedSuites = suites.filter(suite => {
    const hasFailures = suite.hasAttribute("failures") && parseInt(suite.getAttribute("failures"), 10) !== 0
    const hasErrors = suite.hasAttribute("errors") && parseInt(suite.getAttribute("errors"), 10) !== 0
    return hasFailures || hasErrors
  })
  // Gather all the testcase nodes from each failed suite properly.
  let failedSuitesAllTests: Element[] = []
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
