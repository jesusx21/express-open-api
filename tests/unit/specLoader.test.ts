import Sinon from 'sinon';
import SwaggerParser from 'swagger-parser';
import { OpenAPI } from 'openapi-types';

import SpecLoader from 'specLoader';
import { InvalidAPISpecFormat } from 'errors';

describe('SpecLoader', () => {
  describe('loadAPISpec', () => {
    it('should load the API spec successfully', async () => {
      const stub = Sinon.stub(SwaggerParser.prototype, 'validate')
        .resolves({} as OpenAPI.Document);

      const specLoader = new SpecLoader('tests/unit/fixtures/spec.yml');
      const spec = await specLoader.loadAPISpec();

      expect(spec).to.exist;

      stub.restore();
    });

    it('should throw an error if the spec file is invalid', async () => {
      const specLoader = new SpecLoader('invalid/path/to/spec.yaml');

      await expect(
        specLoader.loadAPISpec()
      ).to.be.rejectedWith(InvalidAPISpecFormat);
    });
  });
});
