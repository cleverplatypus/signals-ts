import { DispatchContext } from "./DispatchContext"

export type HandlerResponses = Array<ResolvedResponse | RejectedResponse>
export type ResolvedResponse = true | undefined
export type RejectedResponse = PromiseRejectionEvent | false

export type ListenerWrapper = {
  target: Function
  wrapper: Function
}

export type ListenerArgs<T> = [T] | [] | [T, DispatchContext<T>]

export type ListenerResponse =
  | ResolvedResponse
  | RejectedResponse
  | void
  | Promise<RejectedResponse | ResolvedResponse | void>
export type ResolutionType = 'all' | 'any' | 'none' | 'any-fail'

export type SignalConfig = {
  resolution?: ResolutionType
  haltOnResolve?: boolean
  memoize?: boolean
}

export const PrivateScope = Symbol('PrivateScope')
