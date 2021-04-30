// Directives
import ClickOutside from '../../../src/directives/click-outside'

export const wait = (timeout?: number) => {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

function bootstrap(args?: object) {
  const outsideEl = document.createElement('div')
  const shadowHost = document.createElement('div')
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
  const shadowEl = document.createElement('div')

  const binding = {
    value: jest.fn(),
    args,
  }

  let shadowClickHandler
  let outsideClickHandler

  let shadowMousedownHandler
  let outsideMousedownHandler

  document.body.appendChild(shadowHost)
  shadowRoot.appendChild(shadowEl)

  jest.spyOn(window.document.body, 'addEventListener').mockImplementation((eventName, eventHandler, options) => {
    if (eventName === 'click') outsideClickHandler = eventHandler
    if (eventName === 'mousedown') outsideMousedownHandler = eventHandler
  })

  jest.spyOn(shadowRoot, 'addEventListener').mockImplementation((eventName, eventHandler, options) => {
    if (eventName === 'click') shadowClickHandler = eventHandler
    if (eventName === 'mousedown') shadowMousedownHandler = eventHandler
  })

  jest.spyOn(window.document.body, 'removeEventListener')
  jest.spyOn(shadowRoot, 'removeEventListener')

  ClickOutside.inserted(shadowEl as HTMLElement, binding as any)

  return {
    callback: binding.value,
    shadowEl: shadowEl as HTMLElement,
    outsideEl: outsideEl as HTMLElement,
    shadowRoot: shadowRoot as Node,
    shadowClickHandler,
    outsideClickHandler,
    shadowMousedownHandler,
    outsideMousedownHandler,
  }
}

describe('click-outside.js within the Shadow DOM', () => {
  it('should register and unregister handler outside of the shadow DOM', () => {
    const { outsideClickHandler, shadowEl } = bootstrap()
    expect(window.document.body.addEventListener).toHaveBeenCalledWith('click', outsideClickHandler, true)

    ClickOutside.unbind(shadowEl)
    expect(window.document.body.removeEventListener).toHaveBeenCalledWith('click', outsideClickHandler, true)
  })

  it('should register and unregister handler within the shadow DOM', () => {
    const { shadowClickHandler, shadowRoot, shadowEl } = bootstrap()
    expect(shadowRoot.addEventListener).toHaveBeenCalledWith('click', shadowClickHandler, true)

    ClickOutside.unbind(shadowEl)
    expect(shadowRoot.removeEventListener).toHaveBeenCalledWith('click', shadowClickHandler, true)
  })

  it('should call the callback when closeConditional returns true and event target is outside the shadow DOM', async () => {
    const { outsideClickHandler, callback, outsideEl } = bootstrap({ closeConditional: () => true })
    const event = { target: outsideEl }

    outsideClickHandler(event)
    await wait()
    expect(callback).toHaveBeenCalledWith(event)
  })

  it('should call the callback when closeConditional returns true and event target is within the shadow DOM', async () => {
    const { shadowClickHandler, callback, shadowRoot } = bootstrap({ closeConditional: () => true })
    const event = { target: shadowRoot }

    shadowClickHandler(event)
    await wait()
    expect(callback).toHaveBeenCalledWith(event)
  })

  it('should not call the callback when closeConditional is not provided', async () => {
    const { shadowClickHandler, callback, shadowEl } = bootstrap()

    shadowClickHandler({ target: shadowEl })
    await wait()
    expect(callback).not.toHaveBeenCalled()
  })

  it('should not call the callback when clicked in element within the shadow DOM', async () => {
    const { shadowClickHandler, callback, shadowEl } = bootstrap({ closeConditional: () => true })

    shadowClickHandler({ target: shadowEl })
    await wait()
    expect(callback).not.toHaveBeenCalledWith()
  })

  it('should not call the callback when mousedown was on the element within the shadow DOM', async () => {
    const { shadowClickHandler, shadowMousedownHandler, callback, shadowEl } = bootstrap({ closeConditional: () => true })
    const mousedownEvent = { target: shadowEl }
    const clickEvent = { target: document.createElement('div') }

    shadowMousedownHandler(mousedownEvent)
    shadowClickHandler(clickEvent)
    await wait()
    expect(callback).not.toHaveBeenCalledWith(clickEvent)
  })
})
