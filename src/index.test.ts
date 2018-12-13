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
      ":mag: Can't find junit reports at `./build/reports/**/TESTS*.xml`, skipping generating JUnit Report."
    )
  })

  it("Gives success summary when no failures", async () => {
    await junit({
      pathToReport: "./fixtures/junit_success.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":white_check_mark: All tests are passing\nNice one! All 3 tests are passing."
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
      ":x: 1 tests have failed\nThere are 1 tests failing and 3 skipped out of 19 total tests."
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown).toHaveBeenCalledWith(
      `### Tests:

| Classname | Name | Time | Error |
| --- | --- | --- | --- |
| android.Titanium.UI.Window | .safeAreaPadding with extendSafeArea true | 0.052 | expected 0 to be above 0 |
`
    )
  })

  it("Combines multiple report files", async () => {
    await junit({
      pathToReport: "./fixtures/junit_*.xml",
    })

    expect(global.message).toHaveBeenCalledTimes(1)
    expect(global.message).toHaveBeenCalledWith(
      ":x: 1 tests have failed\nThere are 1 tests failing and 3 skipped out of 22 total tests."
    )
    expect(global.fail).toHaveBeenCalledTimes(1)
    expect(global.fail).toHaveBeenCalledWith("Tests have failed, see below for more information.")
    expect(global.markdown).toHaveBeenCalledTimes(1)
    expect(global.markdown).toHaveBeenCalledWith(
      `### Tests:

| Classname | Name | Time | Error |
| --- | --- | --- | --- |
| android.Titanium.UI.Window | .safeAreaPadding with extendSafeArea true | 0.052 | expected 0 to be above 0 |
`
    )
  })
})
