# Signals.ts

![Tests](https://github.com/cleverplatypus/signals-ts/actions/workflows/test.yml/badge.svg)


> **Breaking change from v1.0.4 to v1.0.5**: Signals now resolve to a single value instead of an array when only one listener is attached.


Signals implementation for TypeScript.

It's a simple pub-sub message bus architecture that's completely decoupled from any UI or other component.

Inspired by [JS-Signals](https://github.com/millermedeiros/js-signals) which was inspired by [AS3-Signals](https://github.com/robertpenner/as3-signals).

## Why another implementation
I used many implementations through the years, mainly [Miller Medeiros'](https://github.com/millermedeiros/js-signals) one.

What I though was missing was:
- TypeScript support 
- Two way decoupled communication


## Installation

```sh
$ npm i --save signals.ts
```
or

```sh
$ yarn add signal.ts
```

or
```sh
$ echo 'whatever package manager you use... the package is on npm.com 🙂'
```

## Basic usage


```ts
//signals.ts --------------------------

import {Signal} from 'signals.ts';
export const MY_SIGNAL = new Signal();
export const MY_OTHER_SIGNAL = new Signal();
//...
```

```ts
// dispatcher.ts ----------------------
import {MY_SIGNAL} from './signals';

MY_SIGNAL.dispatch();
```

```ts
// listener.ts ------------------------

MY_SIGNAL.add(() => {
  //do something about it
})

// or

MY_SIGNAL.addOnce(() => {
  //do something about it just the first time the signal is received
})
```

## Sending data

```ts
const SHOW_NOTIFICATION = new Signal<{title : string, body : string}>();

SHOW_NOTIFICATION.dispatch({title : 'Error', `There's a snake in your boot`});
```

## Receiving data (asynchronously)
```ts
const SHOW_DIALOG = new Signal<{title : string, body : string, buttons : Array<'ok' | 'cancel' | 'yes' | 'no'>}>();
```

```ts
// the enquirer
const response =
  await SHOW_DIALOG.dispatch({title : 'Danger', body : 'This button will destroy the world. Do you want to proceed?', buttons : ['yes', 'no']})
```

```ts
// the dialog view component
SHOW_DIALOG.add((config) => {
  return new Promise(resolve => {
  this.show(config)
    .onResponse(resolve)
  });
})
```

## Controlling propagation
```ts
//any failed response, according to the listenerSuccessTest will stop propagation
const APP_WILL_CLOSE = new Signal({propagate : 'any-fail', listenerSuccessTest: val => val === true})
```

```ts
// The app controller
//Note: responses is an array if multiple listeners are attached
const responses = await APP_WILL_CLOSE.dispatch()

const shouldProceed = !response.some(dirty => dirty = false)


// any listening editors

APP_WILL_CLOSE.add(() => {
  if(this.inABadMood) {
    return false;
  }
});

```

## Retaining early signal dispatchment

```ts
export const APP_WAS_INITIALIZED = new Signal({memoize : true});
```

```ts
// app bootstrapping controller

await this.bootstrap()
APP_WAS_INITIALIZED.dispatch();
```

```ts
// some component we're not sure will be listening in time

// listener will be called even if addOnce is called after the 
// signal was already dispatched
APP_WAS_INITIALIZED.addOnce(() => {
  this.doSomething()
})
```

## Detaching/Suspending a listener
Adding a listener returns a binding object that can be used to temporarily suspend or permanently detach the listener
```ts

const fn1Binding = SOME_SIGNAL.add(functionOne);
SOME_SIGNAL.add(functionTwo);
SOME_SIGNAL.dispatch() //will reach functionOne and functionTwo
fn1Binding.suspend()
SOME_SIGNAL.dispatch() //will reach functionTwo only
fn1Binding.resume()
SOME_SIGNAL.dispatch() //will reach functionOne and functionTwo

fn1Binding.detatch()
SOME_SIGNAL.dispatch() //will reach functionTwo only

fn1Binding.suspend() //will throw Error
fn1Binding.resume() //will throw Error
```


## License ##

 * [Apache 2.0 License](https://opensource.org/license/apache-2-0/)


## Running Tests ##

```sh
$ yarn
$ yarn test
