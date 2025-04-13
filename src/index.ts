import { Registry, Gauge, Counter, Histogram, GaugeHistogram, Info, StateSet, Summary, Unknown } from "./openmetrics-client";

const registry = new Registry({ prefix: "app" });

const version = new Info({
	name: "version",
	help: "Version of the project",
	labels: {
		version: "1.0.0",
	},
	registry: registry,
});

const unknown = new Unknown({
	name: "unknown",
	help: "Avoid using unknown as much as possible",
	value: 42,
	registry: registry,
});

const status = new StateSet({
	name: "service_status",
	help: "Current service status",
	states: ["running", "degraded", "stopped"],
	labels: { instance: "webserver-1" },
	registry: registry,
});

const httpRequests = new Counter({
	name: "http_requests",
	help: "Total HTTP requests",
	labels: {
		method: "GET",
		path: "/v1/health",
	},
	registry: registry,
});

const cpuUsage = new Gauge({
	name: "cpu_usage_percent",
	help: "CPU usage percentage",
	unit: "percent",
	registry: registry,
});

const httpLatency = new Histogram({
	name: "http_request_latency",
	help: "Latency of HTTP requests",
	buckets: [0.5, 1, 5, 10, 25, 50, 100],
	registry: registry,
});

const requestSize = new GaugeHistogram({
	name: "http_request_size",
	help: "HTTP request sizes in queue",
	buckets: [0.5, 1, 5, 10, 25, 50, 100],
	registry: registry,
});

const summary = new Summary({
	name: "test",
	help: "hihi",
	quantiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999],
	maxAgeSeconds: 30,
	ageBuckets: 5,
	registry: registry,
});

setInterval(() => {
	const value = Math.round(Math.random() * 100);

	status.enableOnly("running");
	httpRequests.inc(value);
	cpuUsage.set(value);
	httpLatency.observe(value);
	requestSize.observe(value);
	summary.observe(value);

	console.clear();
	console.log(registry.metricsText());
}, 500);
