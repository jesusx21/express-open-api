import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var expect: typeof chai.expect;
}

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.expect = chai.expect;
