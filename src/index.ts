import { Registry, Gauge, Counter, Histogram, GaugeHistogram, Info, StateSet, Summary, Unknown } from "./openmetrics-client";

// ======================
// 1. Registry Setup
// ======================
const registry = new Registry({
	prefix: "app", // All metrics will be prefixed with 'app_'
});

// ======================
// 2. Info Metrics (for static metadata)
// ======================
const versionInfo = new Info({
	name: "version",
	help: "Application version information",
	labelNames: ["version", "commit_hash", "build_date"],
	registry,
});

// Set version info (typically done once at startup)
versionInfo
	.labels({
		version: "1.2.3",
		commit_hash: "abc123",
		build_date: new Date().toISOString(),
	})
	.set();

// ======================
// 3. StateSet Metrics (for enum-like states)
// ======================
const serviceState = new StateSet({
	name: "service_state",
	help: "Current state of the service",
	states: ["starting", "running", "degraded", "maintenance", "stopped"],
	labelNames: ["service_name"],
	registry,
});

// Set initial states for different services
serviceState.labels({ service_name: "api" }).enableOnly("running");
serviceState.labels({ service_name: "worker" }).enableOnly("starting");

// ======================
// 4. Counter Metrics (for cumulative counts)
// ======================
const httpRequests = new Counter({
	name: "http_requests_total",
	help: "Total HTTP requests processed",
	labelNames: ["method", "path", "status_code"],
	registry,
});

// Example of incrementing counters
httpRequests.labels({ method: "GET", path: "/api/users", status_code: "200" }).inc();
httpRequests.labels({ method: "POST", path: "/api/users", status_code: "201" }).inc(2);

// ======================
// 5. Gauge Metrics (for instantaneous values)
// ======================
const memoryUsage = new Gauge({
	name: "memory_usage_bytes",
	help: "Current memory usage in bytes",
	unit: "bytes",
	registry,
});

const cpuLoad = new Gauge({
	name: "cpu_load_percent",
	help: "Current CPU load percentage",
	unit: "percent",
	labelNames: ["core"],
	registry,
});

// Simulate updating gauge values
setInterval(() => {
	memoryUsage.set(process.memoryUsage().heapUsed);

	// Set different values for each core
	cpuLoad.labels({ core: "0" }).set(Math.random() * 100);
	cpuLoad.labels({ core: "1" }).set(Math.random() * 100);
}, 1000);

// ======================
// 6. Histogram Metrics (for request latencies, sizes)
// ======================
const httpLatency = new Histogram({
	name: "http_request_duration_seconds",
	help: "HTTP request latencies in seconds",
	unit: "seconds",
	buckets: [0.1, 0.3, 0.5, 1, 2, 5], // Custom buckets
	labelNames: ["method", "path"],
	registry,
});

// Example observations
httpLatency.labels({ method: "GET", path: "/api/users" }).observe(0.42);
httpLatency.labels({ method: "POST", path: "/api/orders" }).observe(1.35);

// ======================
// 7. GaugeHistogram Metrics (for current distributions)
// ======================
const requestSizes = new GaugeHistogram({
	name: "http_request_size_bytes",
	help: "Size of HTTP requests in bytes",
	unit: "bytes",
	buckets: [100, 500, 1000, 5000, 10000],
	registry,
});

// Example observations
requestSizes.observe(450); // Would fall in the 500 bucket
requestSizes.observe(1200); // Would fall in the 5000 bucket

// ======================
// 8. Summary Metrics (for pre-calculated quantiles)
// ======================
const dbQueryDuration = new Summary({
	name: "db_query_duration_seconds",
	help: "Database query durations in seconds",
	unit: "seconds",
	quantiles: [0.5, 0.9, 0.95, 0.99], // Track these quantiles
	maxAgeSeconds: 300, // 5 minute sliding window
	ageBuckets: 5, // Number of buckets to use
	registry,
});

// Example observations
for (let i = 0; i < 100; i++) {
	dbQueryDuration.observe(Math.random() * 2);
}

// ======================
// 9. Unknown Metrics (for special cases)
// ======================
const specialValue = new Unknown({
	name: "special_value",
	help: "A special value that doesn't fit standard metric types",
	value: 42,
	registry,
});

// ======================
// 10. Metric Collection & Export
// ======================
function collectAndExportMetrics() {
	console.clear();
	// Get all metrics in OpenMetrics format
	const metricsText = registry.metricsText();

	// In a real application, you might:
	// 1. Expose via HTTP endpoint
	// 2. Push to a metrics gateway
	// 3. Write to a file
	console.log("=== Current Metrics ===");
	console.log(metricsText);

	// Example of getting a single metric
	console.log("\n=== Memory Usage ===");
	console.log(memoryUsage.getMetric());
}

// Collect metrics every 5 seconds
setInterval(collectAndExportMetrics, 5000);

// ======================
// 11. Advanced Examples
// ======================
// Example of tracking concurrent requests
const concurrentRequests = new Gauge({
	name: "http_concurrent_requests",
	help: "Number of concurrent HTTP requests",
	registry,
});

// Simulate request tracking
function trackRequest() {
	concurrentRequests.inc();
	// Simulate request processing
	setTimeout(() => {
		concurrentRequests.dec();
	}, Math.random() * 3000);
}

// Simulate some requests
setInterval(trackRequest, 500);

// Example of tracking errors with a counter
const errorsTotal = new Counter({
	name: "errors_total",
	help: "Total number of errors",
	labelNames: ["type", "component"],
	registry,
});

// Simulate some errors
setInterval(() => {
	if (Math.random() > 0.8) {
		errorsTotal.labels({ type: "database", component: "users-service" }).inc();
	}
}, 1000);
