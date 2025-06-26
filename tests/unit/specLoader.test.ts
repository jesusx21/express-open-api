import Sinon from 'sinon';
import SwaggerParser from 'swagger-parser';

import SpecLoader from 'specLoader';
import { InvalidAPISpecFormat, RouteNotDefinedInOpenAPISpec } from 'errors';
import {
  HTTPMethods,
  Json,
  Schema,
  Spec,
  Validator
} from 'types';

describe('SpecLoader', () => {
  let specLoader: SpecLoader;
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    specLoader = new SpecLoader('tests/unit/fixtures/spec.yml');

    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findValidatorForEndpoint', () => {
    beforeEach(() => {
      const schema = {
        '/pets': {
          [HTTPMethods.GET]: {
            validate: Sinon.stub() as unknown as (params: Json) => void,
            responses: { default: Sinon.stub() as unknown as Validator }
          } as Validator
        }
      } as unknown as Schema;

      sandbox.stub(specLoader, 'getValidationSchema')
        .resolves(schema);
    });

    it('should find the validator for a given endpoint', async () => {
      const validator = await specLoader.findValidatorForEndpoint(HTTPMethods.GET, '/pets');

      expect(validator).to.exist;
      expect(validator.validate).to.exist;
    });

    it('should throw an error if the endpoint is not defined in the spec', async () => {
      await expect(
        specLoader.findValidatorForEndpoint(HTTPMethods.GET, '/nonexistent')
      ).to.be.rejectedWith(RouteNotDefinedInOpenAPISpec);
    });

    it('should throw an error if the endpoint method is not defined in the spec', async () => {
      await expect(
        specLoader.findValidatorForEndpoint(HTTPMethods.POST, '/pets')
      ).to.be.rejectedWith(RouteNotDefinedInOpenAPISpec);
    });
  });

  describe('loadAPISpec', () => {
    it('should load the API spec successfully', async () => {
      sandbox.stub(SwaggerParser.prototype, 'validate')
        .resolves({} as Spec);

      const spec = await specLoader.loadAPISpec();

      expect(spec).to.exist;
    });

    it('should throw an error if the spec file is invalid', async () => {
      await expect(
        specLoader.loadAPISpec()
      ).to.be.rejectedWith(InvalidAPISpecFormat);
    });
  });
});
