import Vue from 'vue'
import { test } from '@/test'
import ClickOutside from '@/directives/click-outside'

function bootstrap (args) {
  const el = document.createElement('div')

  const binding = {
    value: jest.fn(),
    args
  }

  let clickHandler
  let mousedownHandler
  jest.spyOn(window.document.body, 'addEventListener').mockImplementation((eventName, eventHandler, options) => {
    if (eventName === 'click') clickHandler = eventHandler
    if (eventName === 'mousedown') mousedownHandler = eventHandler
  })
  jest.spyOn(window.document.body, 'removeEventListener')
  ClickOutside.inserted(el, binding)

  return {
    callback: binding.value,
    el: el,
    clickHandler,
    mousedownHandler,
  }
}

test('click-outside.js', () => {
  it('should register and unregister handler', () => {
    const { clickHandler, el } = bootstrap()
    expect(global.document.body.addEventListener).toBeCalledWith('click', clickHandler, true)

    ClickOutside.unbind(el)
    expect(global.document.body.removeEventListener).toBeCalledWith('click', clickHandler, true)
  })

  it('should call the callback when closeConditional returns true', async () => {
    const { clickHandler, callback } = bootstrap({ closeConditional: () => true })
    const event = { target: document.createElement('div') }

    clickHandler(event)
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).toBeCalledWith(event)
  })

  it('should not call the callback when closeConditional returns false', async () => {
    const { clickHandler, callback, el } = bootstrap({ test: "lol", closeConditional: () => false })

    clickHandler({ target: el })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalled()
  })

  it('should not call the callback when closeConditional is not provided', async () => {
    const { clickHandler, callback, el } = bootstrap()

    clickHandler({ target: el })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalled()
  })

  it('should not call the callback when clicked in element', async () => {
    const { clickHandler, callback, el } = bootstrap({ closeConditional: () => true })

    clickHandler({ target: el })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalledWith()
  })

  it('should not call the callback when clicked in elements', async () => {
    const { clickHandler, callback, el } = bootstrap({
      closeConditional: () => true,
      include: () => [el]
    })

    clickHandler({ target: document.createElement('div') })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalledWith()
  })

  it('should not call the callback when event is not fired by user action', async () => {
    const { clickHandler, callback } = bootstrap({ closeConditional: () => true })

    clickHandler({ isTrusted: false })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalledWith()

    clickHandler({ pointerType: false })
    await new Promise(resolve => setTimeout(resolve))
    expect(callback).not.toBeCalledWith()
  })
})
