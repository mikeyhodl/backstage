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

import {
  EventsBackend,
  HttpPostIngressEventPublisher,
} from '@backstage/plugin-events-backend';
import { EventSubscriber } from '@backstage/plugin-events-node';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
  subscribers: EventSubscriber[],
): Promise<Router> {
  const eventsRouter = Router();
  const httpRouter = Router();
  eventsRouter.use('/http', httpRouter);

  const http = HttpPostIngressEventPublisher.fromConfig({
    config: env.config,
    logger: env.logger,
    router: httpRouter,
  });

  await new EventsBackend(env.logger)
    .addPublishers(http)
    .addSubscribers(subscribers)
    .start();

  return eventsRouter;
}
