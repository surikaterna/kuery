export type Query = Record<string, any>;

export interface KueryOptions {
  skip: number;
  limit: number;
  sort: Record<string, number>;
}

export type Collection = Array<{
  [key: string]: any;
}>;
