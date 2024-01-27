import { expect, it, vi } from 'vitest';
import { DispatchContext, Signal } from '../src/index';

it('should be possible to use a signal', async () => {
    const signal = new Signal();
    const spy = vi.fn();
    signal.add(spy);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(1);
    signal.removeAll();
})

it('should be possible to interrupt after the first positive result from a listener when resolution is "any"', async () => {
    const signal = new Signal({resolution: 'any', haltOnResolve: true});
    const listener1 = () => Promise.resolve();
    const spy = vi.fn();
    const listener2 = () => {spy()};
    signal.add(listener1, null, 1);
    signal.add(listener2);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(0);
})

it('should be possible to interrupt after the first negative result from a listener when resolution is "any-fail"', async () => {
    const signal = new Signal({resolution: 'any-fail', haltOnResolve: true});
    const listener1 = () => Promise.reject();
    const spy = vi.fn();
    const listener2 = () => {spy()};
    signal.add(listener1, null, 1);
    signal.add(listener2);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(0);
})

it('should be possible to continue signal propagation regardless of the resolution', async () => {
    const signal = new Signal({resolution: 'any', haltOnResolve: false});
    const spy = vi.fn();
    const listener1 = () => { spy(); return Promise.resolve()};
    const listener2 = () => {spy()};
    const listener3 = () => {spy()};
    signal.add(listener1);
    signal.add(listener2);
    signal.add(listener3);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(3);
})

it('listeners added with addOnce should be removed after the first dispatch', async () => {
    const signal = new Signal();
    const spy = vi.fn();
    signal.addOnce(spy);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(1);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(1);
})

it('should be possible to collect results from all listeners', async () => {
    type SignalParam = { accumulator : Array<number> }
    const signal = new Signal<SignalParam>({resolution: 'any', haltOnResolve: false});
    signal.add(({accumulator}) => { accumulator.push(1)}, null, 3);
    signal.add(({accumulator}) => { accumulator.push(2)}, null, 2);
    signal.add(({accumulator}) => { accumulator.push(3)}, null, 1);
    const accumulator = [];
    await signal.dispatch({accumulator});
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBe(6);

})

it('priority in listeners should be respected', async () => {
    type SignalParam = { accumulator : Array<number> }
    const signal = new Signal<SignalParam>({resolution: 'any', haltOnResolve: false});
    signal.add(({accumulator}) => { accumulator.push(1)}, null, 3);
    signal.add(({accumulator}) => { accumulator.push(2)}, null, 2);
    signal.add(({accumulator}) => { accumulator.push(3)}, null, 1);
    const accumulator = [];
    await signal.dispatch({accumulator});
    expect(accumulator).toEqual([1, 2, 3]);
})

it('context.halt() should stop signal propagation', async () => {
    type SignalParam = { accumulator : Array<number> }
    const signal = new Signal<SignalParam>({resolution: 'any', haltOnResolve: true});
    signal.add(({accumulator}) => { accumulator.push(1)}, null, 3);
    signal.add((_ : any, context : DispatchContext<SignalParam>) => { context.halt();}, null, 2);
    signal.add(({accumulator}) => { accumulator.push(3)}, null, 1);
    const accumulator = [];
    await signal.dispatch({accumulator});
    expect(accumulator).toEqual([1]);
})

it('memoized signals should dispatch latest payload upon new add', async () => {
    const signal = new Signal({memoize: true});
    const spy1 = vi.fn();
    signal.add(spy1);
    await signal.dispatch();
    const spy2 = vi.fn();
    signal.add(spy2);
    expect(spy1).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(1);
})

it('attempts to add the same listener more than once should be ignored', async () => {
    const signal = new Signal();
    const spy = vi.fn();
    signal.add(spy);
    signal.add(spy);
    signal.add(spy);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(1);
})

