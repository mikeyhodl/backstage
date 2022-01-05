/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CatalogClient } from '@backstage/catalog-client';
import { CacheClient } from '@backstage/backend-common';
import {
  Entity,
  EntityName,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { IdentityClient } from '@backstage/plugin-auth-backend';
import { ResponseError } from '@backstage/errors';

export class CachedEntityLoader {
  constructor(
    private catalog: CatalogClient,
    private cache: CacheClient,
    private identity: IdentityClient,
  ) {}

  async load(
    entityName: EntityName,
    token: string | undefined,
  ): Promise<Entity | null> {
    const cacheKey = await this.getCacheKey(entityName, token);
    let result = (await this.cache.get(cacheKey)) as Entity | null | undefined;

    // undefined -> not in cache, null -> in cache but entity not accessible for user
    if (result !== undefined) {
      return result;
    }

    try {
      // Set undefined to null so it can be written to cache
      result =
        (await this.catalog.getEntityByName(entityName, { token })) ?? null;
    } catch (err) {
      if (err instanceof ResponseError && err.response.status === 403) {
        result = null;
      } else {
        throw err;
      }
    }

    await this.cache.set(cacheKey, result, { ttl: 5000 });

    return result;
  }

  private async getCacheKey(
    entityName: EntityName,
    token: string | undefined,
  ): Promise<string> {
    const entityRef = stringifyEntityRef(entityName);

    if (!token) {
      return entityRef;
    }

    const response = await this.identity.authenticate(token);

    return `${entityRef}:${response.identity.userEntityRef}`;
  }
}
