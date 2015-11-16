# babel-plugin-transform-aop

Injects aspects into javascript code. Work in progress.

## Installation

```sh
$ npm install babel-plugin-transform-aop
```

## Usage

### Via `.babelrc` 

Not yet.

### Via CLI

```sh
$ babel --plugins node-modules/babe;-plugin-aop/lib/script.js --aspects <aspectFile>
```

### Example of aspects file

```js

aspect('after throwing MyClass.throwMethod*', function advice(exception) {
  console.log('Exception:', exception);
});

aspect('before call MyClass.set*', function advice() {
  console.log('Updating argument..');
  if (typeof value !== 'number' || isNaN(value)) {
    console.log('Wrong parameter!..');
    value = parseInt(value, 10);
  }
});

aspect('around call MyClass.aroundCall', function advice() {
  console.log('before');
  try {
    proceed();
  } catch(e) {
    console.log('exception', e);
  }
  console.log('after');
})
```
