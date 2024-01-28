import { DispatchContext } from "./DispatchContext";
import { SignalBinding } from "./SignalBinding";
import { ListenerWrapper, PrivateScope, PropagationType, SignalConfig } from "./types";

export class Signal<T, RT> {
  private _bindings: Array<SignalBinding<T, RT>>
  private _resolution: PropagationType
  private _haltOnResolve: boolean
  private _memoize: boolean
  private _latestCall?: { payload?: T }
  private _suspended: boolean = false
  private _listenerSuccessTest = (val: any) => val !== undefined

  private resolvers = {
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

  public dispose() {
    this._bindings = []
    this._latestCall = undefined
  }

  suspend() {
    this._suspended = true
  }

  resume() {
    this._suspended = false
  }

  removeAll() {
    this._bindings.forEach((b) => b[PrivateScope].destroy())
    this._bindings = []
  }

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

  add(listener: Function, bindingTarget?: any, priority?: number, isOnce?: boolean) {
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

  addOnce(listener, bindingTarget: any = null, priority: number = 0) {
    return this.add(listener, bindingTarget, priority, true)
  }

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
        replies.push(await b.execute(arg, context))
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
