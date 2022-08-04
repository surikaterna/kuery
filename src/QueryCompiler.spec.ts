import QueryCompiler from './QueryCompiler';

describe('QueryCompiler', () => {
  describe('compile', () => {
    it('compile ne null query', () => {
      const query = {
        attachmentId: { $ne: null }
      };
      const compiler = new QueryCompiler();

      expect(() => {
        compiler.compile(query);
      }).not.toThrowError();
    });
  });
  describe('_compilePredicates', () => {
    it('compile eq query', () => {
      const compiler = new QueryCompiler();
      const p = compiler._compilePredicates({ age: 10 });
      expect(p[0]({ age: 10 })).toBe(true);
    });
  });
  describe('_subQuery', () => {
    it('compile eq query', () => {
      const compiler = new QueryCompiler();
      const p = compiler._subQuery([{ age: 10 }]);
      expect(p[0]({ age: 10 })).toBe(true);
    });
  });
});
