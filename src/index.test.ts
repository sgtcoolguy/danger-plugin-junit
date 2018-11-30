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
  })

  it("Checks test failures were failed", async () => {
    await junit({
      pathToReport: "./fixtures/junit*.xml",
    })

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
