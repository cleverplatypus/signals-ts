import { DispatchContext } from "./DispatchContext";
import { SignalBinding } from "./SignalBinding";
import { ListenerWrapper, PrivateScope, PropagationType, SignalConfig } from "./types";

/**
 * A signal is a simple way to broadcast messages to multiple listeners.
 * It is similar to an event emitter, but it is not an event emitter.
 * It is inspired by the AS3 Signal class by Robert Penner.
 * 
 */
export class Signal<T, RT> {
  private _bindings: Array<SignalBinding<T, RT>>
  private _resolution: PropagationType
  private _haltOnResolve: boolean
  private _memoize: boolean
  private _latestCall?: { payload?: T }
  private _suspended: boolean = false
  private _listenerSuccessTest = (val: any) => val !== undefined

  private resolvers: { [key in PropagationType]: (replies: Array<RT>, wasStopped?: boolean) => boolean } = {
    all: (replies: Array<RT>, wasStopped: boolean = false) =>
      (wasStopped || replies.length === this._bindings.length) && replies.every(this._listenerSuccessTest),
    any: (replies: Array<RT>, wasStopped: boolean = false) =>
      replies.findIndex(this._listenerSuccessTest) > -1,
    'any-fail': (replies: Array<RT>, wasStopped: boolean = false) =>
      replies.findIndex((r) => !this._listenerSuccessTest(r)) > -1,
    none: (replies: Array<RT>, wasStopped: boolean = false) =>
      (wasStopped || replies.length === this._bindings.length) && replies.every(val => !this._listenerSuccessTest(val)),
  }

  private get sortedBindings(): Array<SignalBinding<T, RT>> {
    return this._bindings
      .slice(0)
      .filter((b) => !b[PrivateScope].isSuspended())
      .sort((a, b) => a.priority - b.priority)
      .reverse()
  }

  constructor({ 
      propagate: resolution = 'all', 
      haltOnResolve = false, 
      memoize = false,
      listenerSuccessTest = val => val !== undefined }: SignalConfig = {}) {
    this._bindings = []
    this._resolution = resolution
    this._haltOnResolve = haltOnResolve
    this._memoize = memoize
    this._latestCall = undefined
    this._listenerSuccessTest = listenerSuccessTest;
  }

  /**
   * Forget memorized arguments.
   */
  public forget() {
    this._latestCall = undefined
  }

  /**
   * Destroy and dispose the signal.
   */
  public dispose() {
    this._bindings = []
    this._latestCall = undefined
  }

  /**
   * Suspends the signal. While suspended, dispatches will not be called.
   */
  suspend() {
    this._suspended = true
  }

  resume() {
    this._suspended = false
  }

  /**
   * Removes a listener from the signal.
   */
  removeAll() {
    this._bindings.forEach((b) => b[PrivateScope].destroy())
    this._bindings = []
  }

 /**
  * Checks whether a listener has been added to the signal.
  * @param {Function} listener the function that would be called when the signal is dispatched.
  * @param bindingTarget the function's binding target
  * @returns {boolean} true if the listener is bound to the signal, false otherwise.
  */
  has(listener: Function, bindingTarget?: any) {
    return !!this._bindings.find((b) => b[PrivateScope].isSame(listener, bindingTarget))
  }

  add(
    listener: (data: T) => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number,
    isOnce?: boolean
  ): SignalBinding<T, RT>
  add(
    listener: () => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number,
    isOnce?: boolean
  ): SignalBinding<T, RT>

  add(
    listener: (data: T, context: DispatchContext) => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number,
    isOnce?: boolean
  ): SignalBinding<T, RT>


  /**
 * Adds a listener to the signal.
 *
 * @param {Function} listener - The function to be called when the signal is dispatched. This function can have zero, one, or two parameters. If it has zero parameters, it will be called with no arguments. If it has one parameter, it will be called with the data as the argument. If it has two parameters, it will be called with the data and the dispatch context as the arguments.
 * @param {any} [bindingTarget] - The context in which the listener function is to be executed (i.e., the value of `this` within the listener function). If not provided, the global object will be used as the context.
 * @param {number} [priority] - The priority of the listener. Listeners with higher priority will be called before listeners with lower priority. If not provided, the default priority is 0.
 * @param {boolean} [isOnce] - If true, the listener will be removed after it is called once. If false or not provided, the listener will remain until it is manually removed.
 * @returns {SignalBinding<T, RT>} - A SignalBinding object representing the binding between the signal and the listener.
 */
  add(listener: Function, bindingTarget?: any, priority?: number, isOnce?: boolean): SignalBinding<T, RT> {
    let binding = this._bindings.find((b) => b[PrivateScope].isSame(listener, bindingTarget))
    if (binding) {
      return binding
      //TODO: check discrepancies in isOnce as per other library
    }

    let caller: ListenerWrapper

    if (listener.length === 0) {
      caller = {
        target: listener,
        wrapper: () => listener.call(bindingTarget)
      }
    } else if (listener.length === 1) {
      caller = {
        target: listener,
        wrapper: (data: T) => listener.call(bindingTarget, data)
      }
    } else {
      caller = {
        target: listener,
        wrapper: (data: T, context: DispatchContext) =>
          listener.call(bindingTarget, data, context)
      }
    }
    return this.createBinding(caller, bindingTarget, priority, isOnce)
  }

  private createBinding(
    listener: ListenerWrapper,
    bindingTarget: any,
    priority: number = 0,
    isOnce: boolean = false
  ): SignalBinding<T, RT> {
    const binding = new SignalBinding(this, listener, isOnce, bindingTarget, priority)
    this._bindings.push(binding)
    if (this._memoize && this._latestCall) {
      this.dispatch(this._latestCall.payload)
    }
    return binding
  }

  [PrivateScope] = {
    removeBinding: function (binding: SignalBinding<T, RT>) {
      const index = this._bindings.indexOf(binding)
      if (index > -1) {
        this._bindings.splice(index, 1)
      }
    }.bind(this)
  }

  addOnce(
    listener: (data: T) => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number
  ): SignalBinding<T, RT>
  addOnce(
    listener: () => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number
  ): SignalBinding<T, RT>

  addOnce(
    listener: (data: T, context: DispatchContext) => Promise<RT> | RT,
    bindingTarget?: any,
    priority?: number
  ): SignalBinding<T, RT>

  /**
   * Adds a listener to the signal that will be called only once.
   *
   * @param {Function} listener - The function to be called when the signal is dispatched. This function can have zero, one, or two parameters. If it has zero parameters, it will be called with no arguments. If it has one parameter, it will be called with the data as the argument. If it has two parameters, it will be called with the data and the dispatch context as the arguments.
   * @param {any} [bindingTarget] - The context in which the listener function is to be executed (i.e., the value of `this` within the listener function). If not provided, the global object will be used as the context.
   * @param {number} [priority] - The priority of the listener. Listeners with higher priority will be called before listeners with lower priority. If not provided, the default priority is 0.
   * @returns {SignalBinding<T, RT>} - A SignalBinding object representing the binding between the signal and the listener.
   */
  addOnce(listener, bindingTarget: any = null, priority: number = 0) {
    return this.add(listener, bindingTarget, priority, true)
  }

/**
   * Dispatches the signal, calling all bound listeners with the provided argument.
   * If the signal is suspended, the listeners will not be called.
   * Listeners are asynchronously called sequentially in the order of their priority.
   *
   * @param {T} [arg] - The argument to be passed to the listeners. If not provided, the listeners will be called with no arguments.
   * @returns {Promise<any>} - A promise that resolves with the return value of the last listener that was called. If the signal is suspended, the promise will be rejected with the string 'Signal suspended'.
   * @throws Will throw an error if the signal is currently suspended.
   */
  async dispatch(arg?: T) : Promise<any> {
    if (this._suspended) {
      return Promise.reject('Signal suspended')
    }
    if (this._memoize) {
      this._latestCall = { payload: arg }
    }
    const context = new DispatchContext(this)
    const replies: Array<any> = []

    const remainingBindings = this.sortedBindings.slice()

    for (let b of this.sortedBindings) {
      remainingBindings.shift()
      try {
        replies.push(await b[PrivateScope].execute(arg, context))
        if (b.isOnce) this._bindings.splice(this._bindings.indexOf(b), 1)
      } catch (e) {
        replies.push(e)
      }

      const result = this.resolvers[this._resolution](replies)

      if (result) {
        
        context[PrivateScope].wasYelded = true
        if (this._haltOnResolve) {
          context.halt()
        }
      }
      if (context.wasHalted) {
        remainingBindings.length = 0
        break
      }
    }
    if (remainingBindings.length) {
      setTimeout(() => {
        for (let b of remainingBindings) {
          try {
            b.execute(arg, context)
          } catch (e) {}
        }
      })
    }
    return Promise.resolve(replies);
  }
}
