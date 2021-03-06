// Unit - test the router on its own
const extend = require('extend');
const loadware = require('loadware');
const join = require('server/src/join');
const { get, error } = require('server/router');
const { getter } = require('server/test');

const createCtx = ({ url = '/', path = '/', method = 'GET' } = {}) => extend({
  req: { url, path, method },
  res: { send: () => {} },
  options: {}
});


const router = require('.');


describe('server/router definition', () => {
  it('loads the main router', () => {
    expect(router).toEqual(require('server').router);
    expect(router).toBe(require('server/router'));
  });

  it('has the right methods defined', () => {
    expect(router.get  ).toEqual(jasmine.any(Function));
    expect(router.get  ).toEqual(jasmine.any(Function));
    expect(router.post ).toEqual(jasmine.any(Function));
    expect(router.put  ).toEqual(jasmine.any(Function));
    expect(router.del  ).toEqual(jasmine.any(Function));
    expect(router.sub  ).toEqual(jasmine.any(Function));
    expect(router.error).toEqual(jasmine.any(Function));
  });

  it('can load all the methods manually', () => {
    expect(require('server/router/get'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/get'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/post' )).toEqual(jasmine.any(Function));
    expect(require('server/router/put'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/del'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/sub'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/error')).toEqual(jasmine.any(Function));
  });
});

describe('server/router works', () => {
  it('works', async () => {
    const middles = [
      () => new Promise((resolve) => resolve()),
      get('/aaa', () => { throw new Error(); }),
      get('/', () => 'Hello 世界'),
      get('/sth', () => { throw new Error(); }),
      get('/', () => { throw new Error(); })
    ];

    const ctx = createCtx();
    await join(middles)(ctx);
    expect(ctx.req.solved).toBe(true);
  });

  it('works even when wrapped with join() and loadware()', async () => {
    const middles = [
      () => new Promise((resolve) => resolve()),
      get('/aaa', () => { throw new Error(); }),
      join(loadware(get('/', () => 'Hello 世界'))),
      get('/sth', () => { throw new Error(); }),
      get('/', () => { throw new Error(); })
    ];

    // Returns the promise to be handled async
    const ctx = createCtx();
    await join(middles)(ctx);
    expect(ctx.req.solved).toBe(true);
  });


  it('works with parameters', async () => {
    const ctx = createCtx({ path: '/test/francisco/presencia/bla' });
    await get('/test/:name/:lastname/bla')(ctx);
    expect(ctx.req.solved).toBe(true);
    expect(ctx.req.params.name).toBe('francisco');
    expect(ctx.req.params.lastname).toBe('presencia');
  });
});



describe('Error routes', () => {
  it('can catch errors', async () => {
    const generate = () => { throw new Error('Should be caught'); };
    const handle = error(() => 'Error 世界');
    const res = await getter([generate, handle]);
    expect(res.body).toBe('Error 世界');
  });

  it('can catch errors with full path', () => {
    const generate = ctx => { ctx.throw('test:a'); };
    const handle = error('test:a', ctx => {
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe('test:a');
      ctx.res.send('Error 世界');
    });
    return getter([generate, handle]).then(res => {
      expect(res.body).toBe('Error 世界');
    });
  });

  it('can catch errors with partial path', () => {
    const generate = ctx => { ctx.throw('test:b'); };
    const handle = error('test', ctx => {
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe('test:b');
      ctx.res.send('Error 世界');
    });
    return getter([generate, handle]).then(res => {
      expect(res.body).toBe('Error 世界');
    });
  });

  const errors = {
    'test:pre:1': new Error('Hi there 1'),
    'test:pre:a': new Error('Hi there a'),
    'test:pre:b': new Error('Hi there b'),
    'test:pre:build': opts => new Error(`Hi there ${opts.name}`)
  };

  it('can generate errors', () => {
    const generate = ctx => { ctx.throw('test:pre:1'); };
    const handle = error('test', ctx => {
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe('Hi there 1');
      ctx.res.send('Hello 世界');
    });
    return getter([generate, handle], {}, { errors });
  });

  it('can generate errors with options', () => {
    const generate = ctx => { ctx.throw('test:pre:build', { name: 'ABC' }); };
    const handle = error('test', ctx => {
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe('Hi there ABC');
      ctx.res.send('Hello 世界');
    });
    return getter([generate, handle], {}, { errors });
  });

  it('can generate errors', () => {
    const generate = ctx => { ctx.throw('generic error'); };
    const handle = error('generic error', ctx => {
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.error.message).toBe('generic error');
      ctx.res.send('Hello 世界');
    });
    return getter([generate, handle], {}, { errors });
  });
});
