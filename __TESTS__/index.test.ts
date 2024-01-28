import { expect, it, vi } from 'vitest';
import { Signal } from '../src/index';

it('signals should reach the listener', async () => {
    const signal = new Signal();
    const spy = vi.fn();
    signal.add(spy);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(1);
    signal.removeAll();
})

it('should be possible to interrupt after the first positive result from a listener when resolution is "any"', async () => {
    const signal = new Signal({propagate: 'any', haltOnResolve: true});
    const listener1 = () => Promise.resolve(true);
    const spy = vi.fn();
    const listener2 = () => {spy()};
    signal.add(listener1, null, 1);
    signal.add(listener2);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(0);
})

it('should be possible to interrupt after the first negative result from a listener when resolution is "any-fail"', async () => {
    const signal = new Signal({propagate: 'any-fail', haltOnResolve: true});
    const listener1 = () => undefined;
    const spy = vi.fn();
    const listener2 = () => {spy()};
    signal.add(listener1, null, 1);
    signal.add(listener2);
    await signal.dispatch();
    expect(spy).toBeCalledTimes(0);
})

it('should be possible to continue signal propagation regardless of the resolution', async () => {
    const signal = new Signal({propagate: 'any', haltOnResolve: false});
    const spy = vi.fn();
    const listener1 = () => { spy()};
    const listener2 = () => {spy(); return true};
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
    
    const signal = new Signal({propagate: 'any', haltOnResolve: false});
    signal.add(() => { return 1});
    signal.add(() => { return 2});
    signal.add(() => { return 3});
    const accumulator = 
        await signal.dispatch();
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBe(6);

})

it('priority in listeners should be respected', async () => {
    const signal = new Signal({propagate: 'any', haltOnResolve: false});
    signal.add(() => { return 1}, null, 3);
    signal.add(() => { return 2}, null, 2);
    signal.add(() => { return 3}, null, 1);
    const accumulator = await signal.dispatch();
    expect(accumulator).toEqual([1, 2, 3]);
})

it('context.halt() should stop signal propagation', async () => {
    const signal = new Signal({propagate: 'any', haltOnResolve: true});
    signal.add(() => { return 1}, null, 3);
    signal.add((_ : any, context) => { context.halt();}, null, 2);
    signal.add(() => { return 3}, null, 1);
    const [accumulator] =
        await signal.dispatch();
    expect(accumulator).toEqual(1);
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

it('should be able to configure what a successful listener means', async () => {
    const signal = new Signal<undefined, boolean>({ 
        listenerSuccessTest : (val) =>  val === true, 
        propagate: 'any', 
        haltOnResolve: true });
    const spy = vi.fn();
    signal.add(() => { spy(); return false}, null, 3);
    signal.add(() => { spy(); return false}, null, 2);
    signal.add(() => { spy(); return true}, null, 1);
    signal.add(() => { spy(); return true}, null, 0);

    await signal.dispatch();
    expect(spy).toBeCalledTimes(3);

})

