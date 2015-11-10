# babel-plugin-transform-aop

Injects aspects into javascript code. Work in progress.

## Installation

```sh
$ npm install babel-plugin-transform-aop
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-aop"]
}
```

### Via CLI

```sh
$ babel --plugins transform-aop script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-aop"]
});
```