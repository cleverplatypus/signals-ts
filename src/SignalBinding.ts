import { DispatchContext } from "./DispatchContext";
import { Signal } from "./Signal";
import { ListenerWrapper, PrivateScope } from "./types";

export class SignalBinding<T, RT> {
    private _signal: Signal<T, RT>
    private _listener: ListenerWrapper
  
    readonly isOnce: boolean
    private _priority: number
    private _bindingTarget: any;
    private _suspended = false;

    [PrivateScope] = {
       execute: async function(payload: T | undefined, context: DispatchContext): Promise<any> {
        return this._listener.wrapper.apply(this._bindingTarget, [payload, context])
      }.bind(this),
      destroy: function () {
        this._signal = null
        this._listener = null
        this._bindingTarget = null
      }.bind(this),
      isSuspended: function () {
        return this._suspended
      }.bind(this),
      isSame: function (listener: Function, bindingTarget: any) {
        return this._listener.target === listener && this._bindingTarget === bindingTarget
      }.bind(this)
    }
  
    /**
     * Detach binding from signal.
     * - alias to: mySignal.remove(myBinding.getListener());
     * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
     */
    public detach() {
      if (this.isBound()) {
        this._signal![PrivateScope].removeBinding(this)
        this[PrivateScope].destroy();
      }
    }

    /**
     * Suspend the signal. While suspended, dispatches will not be called.
     */
    public suspend() {
      if(!this.isBound()) throw new Error('Binding is no longer bound to a signal')
      this._suspended = true
    }
    
    /**
     * Resumes the operation of the function.
     */
    public resume() {
      if(!this.isBound()) throw new Error('Binding is no longer bound to a signal')
      this._suspended = false
    }
  
    /**
     * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
     */
    public isBound(): boolean {
      return !!this._signal && !!this._listener
    }
  
    constructor(
      signal: Signal<T, RT>,
      listener: ListenerWrapper,
      isOnce: boolean,
      bindingTarget: any,
      priority: number = 0
    ) {
      this._signal = signal
      this._listener = listener
      this.isOnce = isOnce
      this._bindingTarget = bindingTarget
      this._priority = priority || 0
    }
  
    get priority() {
      return this._priority
    }
  
    
  }