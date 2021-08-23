import junit from "./index"

declare const global: any

describe("junit()", () => {
  beforeEach(() => {
    global.warn = jest.fn()
    global.message = jest.fn()
    global.fail = jest.fn()
    global.markdown = jest.fn()
  })

  afterEach(() => {
    global.warn = undefined
    global.message = undefined
    global.fail = undefined
    global.markdown = undefined
  })

  it("Needs a real xml file", async () => {
    await junit({})

    expect(global.fail).not.toHaveBeenCalled()
    expect(global.markdown).not.toHaveBeenCalled()
    expect(global.warn).toHaveBeenCalledTimes(1)
    expect(global.warn).toHaveBeenCalledWith(
      ":mag: Can't find junit reports at `./build/reports/**/TESTS*.xml`, skipping generating JUnit Report.",
    )
  })

  it("Gives success summary when no failures", async () => {
    await junit({
      pathToReport: "./fixtures/junit_success.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":white_check_mark: All tests are passing\nNice one! All 3 tests are passing.",
    )
    expect(global.fail).toHaveBeenCalledTimes(0)
    expect(global.markdown).toHaveBeenCalledTimes(0)
  })

  it("Checks test failures were failed", async () => {
    await junit({
      pathToReport: "./fixtures/junit_failures.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 3 skipped out of 19 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })

  it("Combines multiple report files", async () => {
    await junit({
      pathToReport: "./fixtures/junit_*.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":x: 2 tests have failed\nThere are 2 tests failing and 3 skipped out of 26 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })

  it("handles karma junit report", async () => {
    await junit({
      pathToReport: "./fixtures/TESTS-android.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 1 skipped out of 2 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })

  it("Handles failures from mocha-jenkins-reporter", async () => {
    await junit({
      pathToReport: "./fixtures/junit_report.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 0 skipped out of 4 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })

  it("Handles skipped from karma-titanium-launcher", async () => {
    await junit({
      pathToReport: "./fixtures/TESTS-ios.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      `:white_check_mark: All tests are passing
Nice one! All 178 tests are passing.
(There are 8 skipped tests not included in that total)`,
    )
    expect(global.fail).toHaveBeenCalledTimes(0)
    expect(global.markdown).toHaveBeenCalledTimes(0)
  })

  it("allows setting a custom header", async () => {
    await junit({
      pathToReport: "./fixtures/junit_failures.xml",
      name: "My awesome tests",
    })

    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 3 skipped out of 19 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("My awesome tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })

  it("allows reporting failures as warnings not errors", async () => {
    await junit({
      pathToReport: "./fixtures/junit_failures.xml",
      onlyWarn: true
    })

    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 3 skipped out of 19 total tests.",
    )
    expect(global.fail).toHaveBeenCalledTimes(0)
    expect(global.warn).toHaveBeenCalledTimes(1)
    expect(global.warn).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown.mock.calls[0][0]).toMatchSnapshot()
  })
})
