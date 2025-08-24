async function handler(req) {
	const contentType = req.headers.get("Content-Type")
	if (!contentType) throw new Error("Missing Content-Type");

	if (contentType.startsWith("multipart/form-data")) {
		const fd = await req.formData()
		const body = Object.fromEntries(fd.entries());
		return new Response(JSON.stringify(body))
	}

	throw new Error("Invalid Content-Type");
}

Bun.serve({
	port: 3000,
	async fetch(request) {
		console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
		await new Promise((resolve) => setTimeout(resolve, 0));
		const response = await handler(request)
		await new Promise((resolve) => setTimeout(resolve, 0));
		return response;
	}
})

console.log("Server running on http://localhost:3000");
console.log("Send FormData requests to reproduce the issue");