import { Signal } from "./Signal"
import { PrivateScope } from "./types"

export class DispatchContext<T> {
    private _halted = false
    readonly signal: Signal<T>
    private _wasYelded = false
  
    constructor(signal: Signal<T>) {
      this.signal = signal
    }
  
    [PrivateScope] = {
      wasYelded: this._wasYelded
    }
  
    halt() {
      if (this._halted) {
        console.warn('`halt` was already called on this context.')
      }
      if (this._wasYelded) {
        console.warn('Calling after dispatch Promise resolution has no effect.')
      }
      this._halted = true
    }
  
    get wasHalted() {
      return this._halted
    }
  }