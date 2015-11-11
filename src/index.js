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

function applyAspectsOnMethod(klass, method, aspects, types) {
  let className = klass.id.name;
  aspects.forEach(aspect => {
    console.log('[debug] Applying aspect ' + aspect.pointcut + ', ' + aspect.joinpoint + ' on ', className + '.' + method.key.name);

    if (aspect.joinpoint === 'before') {
      aspect.code.reverse().forEach(statement=> {
        method.body.body.unshift(statement);
      });
    }

    else if (aspect.joinpoint === 'after') {
      aspect.code.forEach(statement=> {
        method.body.body.push(statement);
      });
    }

    else if (aspect.joinpoint === 'around') {
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
      method.body.body = [];
      aspect.ast.program.body[0].body.body.forEach(statement => {
        method.body.body.push(statement)
      });
    }

    else if (aspect.joinpoint === 'throw') {
      var methodBody = method.body.body;
      method.body.body = [];
      let tryStatement = types.TryStatement();
      let catchClauseParam = aspect.params[0] ? aspect.params[0] : 'err';
      tryStatement.block = types.BlockStatement(methodBody);
      tryStatement.handler = types.CatchClause(
        types.Identifier(catchClauseParam),types.BlockStatement(aspect.code));
      method.body.body.push(tryStatement);
    }

    else if (aspect.joinpoint === 'before_execution') {
      var classMethod = types.ClassMethod(
        'method',
        types.Identifier('_' + aspect.joinpoint + '_' + method.key.name),
        [],types.BlockStatement(aspect.code));
      klass.body.body.push(classMethod);
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
    aspect.params = aspect.ast.program.body[0].params.map(param => param.name);
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
            applyAspectsOnMethod(path.node, method, applicableAspects, t);
          }
        });
      }
    }
  };
}
