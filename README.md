# Signals.ts

Signals (decouple message bus) implementation for TypeScript

Inspired by [JS-Signals](https://github.com/millermedeiros/js-signals) which was inspired by [AS3-Signals](https://github.com/robertpenner/as3-signals).

## Why another implementation
I used many implementations through the years, manly [Miller Medeiros'](https://github.com/millermedeiros/js-signals) one.

What I though was missing was:
- TypeScript support 
- Two way decoupled communication

There are many situations where I want to send out a signal and gather intelligence from the listeners in a decoupled way and in an asynchronous fashion.

```typescript

const someoneHasDirtyDoc = await WILL_CLOSE_EDITOR_SIGNAL.dispatch()

async function someoneWantsToClose() {
  return false;
}

```

## Installation

```sh
$ nvm i --save signals.ts
```
or

```sh
$ yarn add signal.ts
```

or
```sh
$ echo 'whatever package manager you use... the package is on npm.com 🙂'
```



## License ##

 * [Apache 2.0 License](https://opensource.org/license/apache-2-0/)


## Running Tests ##

```sh
$ yarn
$ yarn test
