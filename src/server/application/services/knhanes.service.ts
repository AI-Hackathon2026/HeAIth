import IKnhanesAdapter, { IKnhanesAdapterFilters, IKnhanesMetricResult } from "../port/I.knhanes.adapter";

export class KnhanesService {
  constructor(private adapter: IKnhanesAdapter) {}

  async listFiles() {
    return this.adapter.listAvailableFiles();
  }

  async queryMetric(fileName: string, metric: string, filters?: IKnhanesAdapterFilters): Promise<IKnhanesMetricResult | null> {
    return this.adapter.getMetricValue(fileName, metric, filters);
  }
}

export default KnhanesService;
