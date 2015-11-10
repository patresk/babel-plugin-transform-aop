'use strict';

var fs = require('fs');
var babel = require('babel-core');
var vm = require('vm');

function pointcutToRegex(pointcut) {
  return new RegExp(pointcut.replace('*', '.*'));
}

function getAspectForMethod(className, methodName, aspects) {
  return aspects.filter(aspect => {
    return (className + '.' + methodName).match(pointcutToRegex(aspect.pointcut));
  });
}

function applyAspectsOnMethod(className, method, aspects) {
  aspects.forEach(aspect => {
    console.log('[debug] Applying aspect ' + aspect.pointcut + ', ' + aspect.joinpoint + ' on ', className + '.' + method.key.name);
    if (aspect.joinpoint === 'before') {
      aspect.code.reverse().forEach(statement=> {
        method.body.body.unshift(statement);
      });
    } else if (aspect.joinpoint === 'after') {
      aspect.code.forEach(statement=> {
        method.body.body.push(statement);
      });
    } else if (aspect.joinpoint === 'around') {
      babel.traverse(aspect.ast, {
        ExpressionStatement: function(path) {
          if (path.node.expression.type === 'CallExpression') {
            if (path.node.expression.callee.name === 'proceed') {
              path.parent.body = [];
              method.body.body.forEach(statement => {
                path.parent.body.push(statement);
              });
            }
          }
        }
      });
      //console.log(aspect.ast.program.body[0].body.body);
      method.body.body = [];
      aspect.ast.program.body[0].body.body.forEach(statement => {
        method.body.body.push(statement)
      });
    }
  });
}

module.exports = function({ types: t }) {

  var context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('./aspects.js', 'utf8'), context);

  var aspects = context.aspects.map(sandboxAspect => {
    let aspect = sandboxAspect;
    let transformed = babel.transform(sandboxAspect.advice.toString());
    aspect.ast = transformed.ast;
    aspect.code = transformed.ast.program.body[0].body.body;
    return aspect;
  });

  return {
    visitor: {
      ClassDeclaration: function(path, state) {
        let className = path.node.id.name;
        let methods = path.node.body.body.filter(item => item.type === 'ClassMethod');

        methods.forEach(method => {
          let applicableAspects = getAspectForMethod(className, method.key.name, aspects);
          if (applicableAspects.length > 0) {
            applyAspectsOnMethod(className, method, applicableAspects);
          }
        });
      }
    }
  };
}
