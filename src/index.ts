import { Registry, Gauge, Counter, Histogram, GaugeHistogram, Info, StateSet, Summary, Unknown } from "./openmetrics-client";

// Create a central registry with a prefix
const registry = new Registry({ prefix: "app" });

// Service version info
const version = new Info({
	name: "service_version",
	help: "Current version of the application",
	labels: {
		version: "1.0.0",
	},
	registry,
});

// Example of a metric type that should generally be avoided
const unknown = new Unknown({
	name: "unexpected_metric",
	help: "Example of an unknown metric type — avoid using in production",
	value: 42,
	registry,
});

// Service status state set
const serviceStatus = new StateSet({
	name: "service_status",
	help: "Current operational status of the service",
	states: ["running", "degraded", "stopped"],
	labels: { instance: "api-server-1" },
	registry,
});

// HTTP request counter
const httpRequestTotal = new Counter({
	name: "http_requests_total",
	help: "Total number of HTTP requests received",
	labels: {
		method: "GET",
		endpoint: "/v1/health",
	},
	registry,
});

// CPU usage gauge in percentage
const cpuUsage = new Gauge({
	name: "cpu_usage",
	help: "Current CPU usage of the application in percent",
	unit: "percent",
	registry,
});

// Histogram for HTTP request latency in milliseconds
const httpRequestLatency = new Histogram({
	name: "http_request_latency",
	help: "Histogram of HTTP request latencies in milliseconds",
	unit: "milliseconds",
	buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
	registry,
});

// GaugeHistogram for tracking sizes of HTTP request bodies
const httpRequestSize = new GaugeHistogram({
	name: "http_request_size_bytes",
	help: "Size of incoming HTTP requests in bytes",
	unit: "bytes",
	buckets: [100, 500, 1000, 5000, 10000, 50000],
	registry,
});

// Summary for request durations
const requestDurationSummary = new Summary({
	name: "http_request_duration_seconds",
	help: "Summary of HTTP request durations in seconds",
	unit: "seconds",
	quantiles: [0.5, 0.9, 0.95, 0.99],
	maxAgeSeconds: 60,
	ageBuckets: 5,
	registry,
});

setInterval(() => {
	const latency = +(Math.random() * 500).toFixed(2); // ms
	const size = Math.floor(Math.random() * 10000); // bytes
	const duration = +(latency / 1000).toFixed(3); // seconds

	serviceStatus.enableOnly("running");
	httpRequestTotal.inc();
	cpuUsage.set(Math.round(Math.random() * 100));
	httpRequestLatency.observe(latency);
	httpRequestSize.observe(size);
	requestDurationSummary.observe(duration);

	console.clear();
	console.log(registry.metricsText());
}, 500);
