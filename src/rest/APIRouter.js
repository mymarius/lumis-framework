'use strict';

class APIRouter {
  
  constructor(rest) {
    this.rest = rest;

    return this._createProxy([]);
  }

  _createProxy(path) {
    const rest = this.rest;

    const handler = {
      get(target, property) {

        if (['get', 'post', 'patch', 'put', 'delete'].includes(property)) {
          return (options = {}) => {
            const endpoint = '/' + path.join('/');
            return rest.request(property.toUpperCase(), endpoint, options);
          };
        }

        return new Proxy(() => {}, {
          get: handler.get,
          apply(_, __, args) {

            if (args.length > 0) {
              return new Proxy(() => {}, {
                get(_, prop) {
                  return handler.get(_, prop);
                },
                apply: handler.apply,
              });
            }
            return new Proxy(() => {}, handler);
          },
        });

      },
    };

    return this._buildProxy(path);
  }

  _buildProxy(parts) {
    const rest = this.rest;

    const routeProxy = new Proxy(() => {}, {
      get(target, property) {

        if (['get', 'post', 'patch', 'put', 'delete'].includes(property)) {
          return (options = {}) => {
            const endpoint = '/' + parts.join('/');
            return rest.request(property.toUpperCase(), endpoint, options);
          };
        }

        return APIRouter.prototype._buildProxy([...parts, property]);
      },

      apply(target, thisArg, args) {

        if (args.length > 0) {
          return APIRouter.prototype._buildProxy([...parts, String(args[0])]);
        }
        return APIRouter.prototype._buildProxy(parts);
      },
    });

    return routeProxy;
  }
}

module.exports = APIRouter;
