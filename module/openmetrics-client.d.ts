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
declare abstract class BaseMetric {
	readonly name: string;
	readonly help: string;
	readonly unit?: string;
	readonly labels: Record<string, string>;
	registry?: Registry;
	constructor(options: MetricOptions);
	protected validateLabels(labels?: Record<string, string>): void;
	getFullName(prefix?: string): string;
	protected formatLabels(labels?: Record<string, string>): string;
	protected metadata(type: string, prefix?: string): string;
	abstract getMetric(prefix?: string): string;
}
export declare class Registry {
	private metrics;
	private prefix?;
	private readonly autoRegister;
	constructor(options?: RegistryOptions);
	private getMetricKey;
	register(metric: BaseMetric): void;
	unregister(metric: BaseMetric): boolean;
	unregisterByName(name: string): number;
	getMetrics(): BaseMetric[];
	getMetric(name: string, labels?: Record<string, string>): BaseMetric | undefined;
	metricsText(): string;
	clear(): void;
}
export declare class Counter extends BaseMetric {
	private value;
	private updated;
	private created;
	constructor(options: MetricOptions);
	inc(amount?: number): void;
	get(): CounterData;
	reset(): void;
	getMetric(prefix?: string): string;
}
export declare class Gauge extends BaseMetric {
	private value;
	private updated;
	constructor(options: MetricOptions);
	inc(amount?: number): void;
	dec(amount?: number): void;
	set(value: number): void;
	get(): GaugeData;
	getMetric(prefix?: string): string;
}
export declare class Histogram extends BaseMetric {
	private readonly buckets;
	private counts;
	private sum;
	private count;
	private updated;
	private created;
	constructor(options: MetricOptions & {
		buckets?: number[];
	});
	observe(value: number): void;
	reset(): void;
	getMetric(prefix?: string): string;
	getSnapshot(): HistogramData;
}
export declare class Summary extends BaseMetric {
	private readonly quantiles;
	private readonly maxAgeSeconds;
	private readonly ageBuckets;
	private buckets;
	private currentBucket;
	private rotationInterval;
	private sum;
	private count;
	private updated;
	private created;
	private isDestroyed;
	constructor(options: SummaryOptions);
	private createBucket;
	private validateQuantiles;
	private rotateBuckets;
	private recalculateAggregates;
	observe(value: number): void;
	reset(): void;
	getMetric(prefix?: string): string;
	getSnapshot(): SummaryData;
	destroy(): void;
}
export declare class GaugeHistogram extends BaseMetric {
	private readonly buckets;
	private counts;
	private sum;
	private count;
	private updated;
	private created;
	constructor(options: MetricOptions & {
		buckets?: number[];
	});
	observe(value: number): void;
	reset(): void;
	getMetric(prefix?: string): string;
	getSnapshot(): GaugeHistogramData;
}
export declare class Info extends BaseMetric {
	constructor(options: MetricOptions);
	getMetric(prefix?: string): string;
}
export declare class StateSet extends BaseMetric {
	private states;
	constructor(options: MetricOptions & {
		states: string[];
	});
	private validateStates;
	setState(state: string, value: boolean): void;
	enableOnly(state: string): void;
	getMetric(prefix?: string): string;
}
export declare class Unknown extends BaseMetric {
	private value;
	constructor(options: MetricOptions & {
		value?: number;
	});
	set(value: number): void;
	getMetric(prefix?: string): string;
}

export {};
