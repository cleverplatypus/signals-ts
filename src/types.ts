import { DispatchContext } from "./DispatchContext"

export type ListenerWrapper = {
  target: Function
  wrapper: Function
}

export type ListenerArgs<T> = [T] | [] | [T, DispatchContext]

export type PropagationType = 'all' | 'any' | 'none' | 'any-fail'

export type SignalConfig = {
  propagate?: PropagationType
  haltOnResolve?: boolean
  memoize?: boolean
  listenerSuccessTest? : (value: any) => boolean
}

export const PrivateScope = Symbol('PrivateScope')
