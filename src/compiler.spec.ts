import _ from 'lodash/fp';
import QueryCompiler from './compiler';

describe('QueryCompiler', function () {
  describe('compile', function () {
    it('compile ne null query', function () {
      const query = {
        attachmentId: { $ne: null }
      };
      const compiler = new QueryCompiler();

      expect(() => {
        compiler.compile(query);
      }).not.toThrowError();

      // should.doesNotThrow(function () {
      //   compiler.compile(query);
      // });
    });
  });
  describe('_compilePredicates', function () {
    it('compile eq query', function () {
      const compiler = new QueryCompiler();
      const p = compiler._compilePredicates({ age: 10 });
      expect(p[0]({ age: 10 })).toBe(true);
      // p[0]({age:10}).should.be.true;
    });
  });
  describe('_subQuery', function () {
    it('compile eq query', function () {
      const compiler = new QueryCompiler();
      const p = compiler._subQuery([{ age: 10 }]);
      expect(p[0]({ age: 10 })).toBe(true);
      // p[0]({age:10}).should.be.true;
    });
  });
});