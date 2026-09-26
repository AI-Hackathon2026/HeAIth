export interface IKnhanesAdapterFilters {
  sex?: string; // e.g., "남자", "여자", "전체"
  age?: string; // e.g., "30-39", "40-49", "전체"
  income?: string; // e.g., "하", "중하", "중", "중상", "상"
}

export interface IKnhanesMetricResult {
  value: number | null;
  raw: any;
  file: string;
  sheet: string;
  rowIndex?: number;
  colIndex?: number;
}

export interface IKnhanesAdapter {
  listAvailableFiles(): Promise<string[]>;
  getMetricValue(fileName: string, metric: string, filters?: IKnhanesAdapterFilters): Promise<IKnhanesMetricResult | null>;
}

export default IKnhanesAdapter;
