import type { Registry } from "./Registry";

export interface RegistryOptions {
	prefix?: string;
	autoRegister?: boolean;
}

export interface MetricOptions {
	name: string;
	help: string;
	unit?: string;
	labels?: Record<string, string>;
	registry?: Registry;
}

export interface CounterData {
	value: number;
	updated: Date;
	created: Date;
}

export interface GaugeData {
	value: number;
	updated: Date;
}

export interface GaugeHistogramData {
	buckets: number[];
	counts: Map<string, number>;
	sum: number;
	count: number;
	updated: Date;
	created: Date;
}

export interface HistogramData {
	buckets: number[];
	counts: Map<string, number>;
	sum: number;
	count: number;
	updated: Date;
	created: Date;
}

export interface SummaryOptions extends MetricOptions {
	quantiles?: number[];
	maxAgeSeconds?: number;
	ageBuckets?: number;
}

export interface SummaryBucket {
	values: number[];
	sum: number;
	count: number;
	timestamp: number;
}

export interface SummaryData {
	sum: number;
	count: number;
	buckets: number;
	currentBucketSize: number;
	maxAgeSeconds: number;
	updated: Date;
	created: Date;
}
