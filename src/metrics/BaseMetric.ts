import type { Registry } from "../Registry";
import type { MetricOptions } from "../types";

export abstract class BaseMetric {
	public readonly name: string;
	public readonly help: string;
	public readonly unit?: string;
	public readonly labels: Record<string, string>;
	public registry?: Registry;

	constructor(options: MetricOptions) {
		this.name = options.name;
		this.help = options.help;
		this.unit = options.unit;
		this.labels = options.labels || {};

		if (options.registry) {
			this.registry = options.registry;
			this.registry.register(this);
		}
	}

	protected validateLabels(labels?: Record<string, string>): void {
		if (labels) {
			for (const [key, value] of Object.entries(labels)) {
				if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
					throw new Error(`Invalid label name: ${key}`);
				}
				if (typeof value !== "string") {
					throw new Error(`Label value must be string for key: ${key}`);
				}
			}
		}
	}

	getFullName(prefix?: string): string {
		return prefix ? `${prefix}_${this.name}` : this.name;
	}

	protected formatLabels(labels?: Record<string, string>): string {
		const allLabels = { ...this.labels, ...labels };
		if (Object.keys(allLabels).length === 0) return "";

		const labelStrings = Object.entries(allLabels).map(([k, v]) => `${k}="${escapeLabelValue(v)}"`);
		return `{${labelStrings.join(",")}}`;
	}

	protected metadata(type: string, prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const lines = [`# TYPE ${fullName} ${type}`];
		if (this.unit) {
			lines.push(`# UNIT ${fullName} ${this.unit}`);
		}
		lines.push(`# HELP ${fullName} ${this.help}`);
		return lines.join("\n");
	}

	abstract getMetric(prefix?: string): string;
}

function escapeLabelValue(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}
