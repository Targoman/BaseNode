import { ValidatorInstance, init } from 'express-oas-validator'
import { EventEmitter } from 'stream';

export default function (instance: EventEmitter): Promise<ValidatorInstance> {
  return new Promise((resolve, reject) => {
    instance.on('finish', (swaggerDef: any) => {
      const { validateRequest, validateResponse } = init(swaggerDef);
      resolve({ validateRequest, validateResponse });
    });

    instance.on('error', (err: any) => {
      reject(err);
    });
  })
}

