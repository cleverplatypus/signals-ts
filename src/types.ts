import { DispatchContext } from "./DispatchContext"

export type HandlerResponse = Promise<any> | any

export type ListenerWrapper = {
  target: Function
  wrapper: Function
}

export type ListenerArgs<T> = [T] | [] | [T, DispatchContext]

export type ResolutionType = 'all' | 'any' | 'none' | 'any-fail'

export type SignalConfig = {
  resolution?: ResolutionType
  haltOnResolve?: boolean
  memoize?: boolean
  listenerSuccessTest? : (value: any) => boolean
}

export const PrivateScope = Symbol('PrivateScope')
