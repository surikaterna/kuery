var QueryCompiler = require('../lib/compiler'); 
describe('QueryCompiler', function () {
  describe('_compilePredicates', function () {
    it('compile eq query', function () {
      var compiler = new QueryCompiler();
      var p = compiler._compilePredicates({age:10});
      p[0]({age:10}).should.be.true;
    })
  });
  describe('_subQuery', function () {
    it('compile eq query', function () {
      var compiler = new QueryCompiler();
      var p = compiler._subQuery([{age:10}]);
      p[0]({age:10}).should.be.true;
    })
  });
});
