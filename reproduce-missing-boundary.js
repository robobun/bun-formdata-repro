// Reproduction for the specific "FormData missing final boundary" error
// This attempts to reproduce the exact issue from the original GitHub report

async function handler(req) {
    const contentType = req.headers.get("Content-Type")
    if (!contentType) throw new Error("Missing Content-Type");

    console.log(`[${new Date().toISOString()}] Processing request with Content-Type: ${contentType}`);

    if (contentType.startsWith("multipart/form-data")) {
        try {
            const fd = await req.formData()
            const body = Object.fromEntries(fd.entries());
            console.log(`[${new Date().toISOString()}] Successfully parsed FormData:`, body);
            return new Response(JSON.stringify({ success: true, data: body }))
        } catch (error) {
            console.error(`[${new Date().toISOString()}] FormData error:`, error.message);
            return new Response(JSON.stringify({ 
                success: false, 
                error: error.message,
                stack: error.stack 
            }), { status: 500 });
        }
    }

    throw new Error("Invalid Content-Type");
}

// Exact reproduction from the original issue - key is the setTimeout calls
const server = Bun.serve({
    port: 3000,
    async fetch(request) {
        console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
        
        // This is the key part from the original issue - these setTimeout calls seem to trigger the bug
        await new Promise((resolve) => setTimeout(resolve, 0));
        const response = await handler(request);
        await new Promise((resolve) => setTimeout(resolve, 0));
        
        return response;
    }
});

console.log("Server running on http://localhost:3000");
console.log("This reproduces the original 'FormData missing final boundary' error");
console.log("The bug appears when there are async delays (setTimeout) in the request handler");

// Self-test function to create problematic requests
async function createProblematicRequests() {
    console.log("\n=== Creating requests that may trigger boundary issues ===");
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    for (let i = 0; i < 50; i++) {
        // Create FormData with various content to stress test boundary parsing
        const formData = new FormData();
        formData.append('test', `value-${i}`);
        formData.append('data', JSON.stringify({ index: i, timestamp: Date.now() }));
        
        // Add binary data that might affect boundary detection
        const binaryData = new Uint8Array(100).fill(i % 256);
        const blob = new Blob([binaryData], { type: 'application/octet-stream' });
        formData.append('binary', blob, `file-${i}.bin`);
        
        // Add text with potential boundary-breaking content
        formData.append('boundary-test', `--boundary-${i}--\r\n\r\ntest`);
        
        try {
            const response = await fetch('http://localhost:3000', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`❌ Request ${i} failed:`, errorText);
                
                // Check if this is the specific boundary error we're looking for
                if (errorText.includes('missing final boundary')) {
                    console.log(`🎯 FOUND IT! Request ${i} triggered "missing final boundary" error`);
                }
            } else {
                const result = await response.json();
                if (result.success) {
                    console.log(`✅ Request ${i} succeeded`);
                } else {
                    console.log(`❌ Request ${i} server error:`, result.error);
                    if (result.error.includes('missing final boundary')) {
                        console.log(`🎯 FOUND IT! Request ${i} triggered "missing final boundary" error on server`);
                    }
                }
            }
        } catch (error) {
            console.log(`💥 Request ${i} network error:`, error.message);
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

// Auto-start the test after a brief delay
setTimeout(() => {
    createProblematicRequests().catch(console.error);
}, 500);