import { VNodeDirective } from 'vue/types/vnode'
import { attachedRoot } from '../util/dom'

// src/directives/click-outside.ts(29,23): error TS2693: 'ShadowRoot' only refers to a type, but is being used as a value here.
// src/directives/click-outside.ts(46,23): error TS2693: 'ShadowRoot' only refers to a type, but is being used as a value here.
// src/directives/click-outside.ts(46,51): error TS2339: Property 'host' does not exist on type 'ShadowRoot | HTMLDocument'.
//   Property 'host' does not exist on type 'HTMLDocument'.
// src/directives/click-outside.ts(50,73): error TS2339: Property 'include' does not exist on type 'never'.
// src/directives/click-outside.ts(58,25): error TS7006: Parameter 'el' implicitly has an 'any' type.
// src/directives/click-outside.ts(62,88): error TS2339: Property 'handler' does not exist on type '(e: Event) => void'.

interface ClickOutsideBindingArgs {
  closeConditional?: (e: Event) => boolean
  include?: () => HTMLElement[]
}

interface ClickOutsideDirective extends VNodeDirective {
  value?: (e: Event) => void
  args?: ClickOutsideBindingArgs
}

function closeConditional () {
  return false
}

function isShadowRoot (el: null | HTMLDocument | ShadowRoot): boolean {
  if (el && ('host' in el && 'mode' in el)) {
    return true
  }
  return false
}
function checkIsActive (e: PointerEvent, binding: ClickOutsideDirective): boolean | void {
  binding.args = binding.args || {}
  const isActive = (binding.args.closeConditional || closeConditional)
  return isActive(e)
}

function handleShadow (el: HTMLElement, callback: Function): void {
  const root = attachedRoot(el)

  callback(document.body)

  if (isShadowRoot(root)) {
    callback(root)
  }
}

function checkEvent (e: PointerEvent, el: HTMLElement, binding: ClickOutsideDirective): boolean {
  // The include element callbacks below can be expensive
  // so we should avoid calling them when we're not active.
  // Explicitly check for false to allow fallback compatibility
  // with non-toggleable components

  if (!e || checkIsActive(e, binding) === false) return false

  // If we're clicking inside the shadowroot, then the app root doesn't get the same
  // level of introspection as to _what_ we're clicking. We want to check to see if
  // our target is the shadowroot parent container, and if it is, ignore.
  const root = attachedRoot(el)
  // TS Compat workaroud, check properties instead of type
  if (root && isShadowRoot(root) && ((root as ShadowRoot).host === e.target)) return false

  // if (root instanceof ShadowRoot && (root && (root as ShadowRoot).host === e.target)) return false

  // Check if additional elements were passed to be included in check
  // (click must be outside all included elements, if any)
  const elements = ((typeof binding.args === 'object' && binding.args.include) || (() => []))()
  // Add the root element for the component this directive was defined on
  elements.push(el)
  // Check if it's a click outside our elements, and then if our callback returns true.
  // Non-toggleable components should take action in their callback and return falsy.
  // Toggleable can return true if it wants to deactivate.
  // Note that, because we're in the capture phase, this callback will occur before
  // the bubbling click event on any outside elements.
  return !elements.some(el => el.contains(e.target as Node))
}

function directive (e: PointerEvent, el: HTMLElement, binding: ClickOutsideDirective) {
  // const handler = typeof binding.value === 'function' ? binding.value : binding.value!.handler
  const handler = typeof binding.value === 'function' ? binding.value : null

  el._clickOutside!.lastMousedownWasOutside && checkEvent(e, el, binding) && setTimeout(() => {
    checkIsActive(e, binding) && handler && handler(e)
  }, 0)
}

export default {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  inserted (el: HTMLElement, binding: ClickOutsideDirective) {
    const clickEvent = window['VUETIFY_ON_TOUCH'] == null ? 'click' : 'touchstart'
    console.log('click-outside:bind with event ', clickEvent)
    const onClick = (e: Event) => directive(e as PointerEvent, el, binding)
    const onMousedown = (e: Event) => {
      el._clickOutside!.lastMousedownWasOutside = checkEvent(e as PointerEvent, el, binding)
    }
    // iOS does not recognize click events on document
    // or body, this is the entire purpose of the v-app
    // component and [data-app], stop removing this

    // This is only for unit tests
    // app.addEventListener(clickEvent, onClick, true)
    handleShadow(el, (app: HTMLElement) => {
      app.addEventListener(clickEvent, onClick, true)
      app.addEventListener('mousedown', onMousedown, true)
    })
    el._clickOutside = {
      lastMousedownWasOutside: true,
      onClick,
      onMousedown
    }
  },

  unbind (el: HTMLElement) {
    if (!el._clickOutside) return
    const clickEvent = window['VUETIFY_ON_TOUCH'] == null ? 'click' : 'touchstart'
    console.log('click-outside:unbind with event', clickEvent)
    // const app = document.querySelector('[data-app]') ||
    //   document.body // This is only for unit tests
    // app && app.removeEventListener('click', el._clickOutside, true)
    handleShadow(el, (app: HTMLElement) => {
      if (!app || !el._clickOutside) return
      app.removeEventListener(clickEvent, el._clickOutside.onClick, true)
      app.removeEventListener('mousedown', el._clickOutside.onMousedown, true)
    })
    delete el._clickOutside
  }
}
