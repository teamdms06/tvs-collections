import { commercialConfig } from './commercial'
import { consumerDurableConfig } from './consumerDurable'
import { retailConfig } from './retail'

export const productConfigs = {
  consumer: consumerDurableConfig,
  retail: retailConfig,
  commercial: commercialConfig,
}
