// This reproduces the "FormData missing final boundary" error specifically

async function testBoundaryIssues() {
    console.log('Testing boundary parsing issues...');
    
    // Test 1: Rapidly send many FormData requests with async delays like the original issue
    const server = Bun.serve({
        port: 3003,
        async fetch(req) {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
            
            if (req.method !== 'POST') {
                return new Response('Send POST with FormData');
            }
            
            const contentType = req.headers.get('Content-Type');
            if (!contentType || !contentType.startsWith('multipart/form-data')) {
                return new Response('Send multipart/form-data', { status: 400 });
            }
            
            try {
                // Add async operations like the original bug report
                await new Promise(resolve => setTimeout(resolve, 0));
                
                const formData = await req.formData();
                
                await new Promise(resolve => setTimeout(resolve, 0));
                
                const data = Object.fromEntries(formData.entries());
                return new Response(JSON.stringify({
                    success: true,
                    data,
                    contentType,
                    boundary: contentType.split('boundary=')[1]?.substring(0, 20) + '...'
                }));
                
            } catch (error) {
                console.error('FormData error:', error.message);
                return new Response(JSON.stringify({
                    success: false,
                    error: error.message,
                    contentType,
                    stack: error.stack
                }), { status: 500 });
            }
        }
    });
    
    console.log('Server started on port 3003');
    
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test with rapid concurrent requests like frameworks do
    const testConcurrentRequests = async (numRequests = 100) => {
        console.log(`\nSending ${numRequests} concurrent FormData requests...`);
        
        const promises = [];
        for (let i = 0; i < numRequests; i++) {
            const formData = new FormData();
            formData.append('request_id', i.toString());
            formData.append('timestamp', Date.now().toString());
            formData.append('data', JSON.stringify({ test: 'value', random: Math.random() }));
            
            // Add some binary data to make the boundary more complex
            const blob = new Blob([`request-${i}-data-${Math.random()}`], { type: 'text/plain' });
            formData.append('file', blob, `test-${i}.txt`);
            
            promises.push(
                fetch('http://localhost:3003', {
                    method: 'POST',
                    body: formData
                }).then(async response => {
                    try {
                        const result = await response.text();
                        return {
                            id: i,
                            success: response.ok,
                            result: response.ok ? JSON.parse(result) : result,
                            status: response.status
                        };
                    } catch (e) {
                        return {
                            id: i,
                            success: false,
                            error: e.message,
                            status: response.status
                        };
                    }
                }).catch(error => ({
                    id: i,
                    success: false,
                    error: error.message
                }))
            );
        }
        
        const results = await Promise.all(promises);
        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);
        
        console.log(`Results: ${successes.length} successes, ${failures.length} failures`);
        
        if (failures.length > 0) {
            console.log('\nFailure examples:');
            failures.slice(0, 10).forEach(f => {
                console.log(`  Request ${f.id}: ${f.error || (f.result?.error || f.result)}`);
            });
        }
        
        return { successes: successes.length, failures: failures.length, results };
    };
    
    // Multiple test rounds with increasing concurrency
    const testRounds = [10, 25, 50, 100];
    
    for (const numRequests of testRounds) {
        const result = await testConcurrentRequests(numRequests);
        
        if (result.failures > 0) {
            console.log(`\n🔴 Found ${result.failures} failures with ${numRequests} concurrent requests!`);
            
            // Check if we got the specific boundary error
            const boundaryErrors = result.results.filter(r => 
                !r.success && (
                    r.error?.includes('boundary') || 
                    r.result?.error?.includes('boundary') ||
                    r.result?.includes('boundary')
                )
            );
            
            if (boundaryErrors.length > 0) {
                console.log(`\n🎯 Found ${boundaryErrors.length} boundary-related errors!`);
                boundaryErrors.slice(0, 3).forEach(e => {
                    console.log(`  ${e.error || e.result?.error || e.result}`);
                });
            }
        } else {
            console.log(`✅ All ${numRequests} requests succeeded`);
        }
        
        // Small delay between test rounds
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    server.stop();
    console.log('Test completed');
}

if (import.meta.main) {
    testBoundaryIssues().catch(console.error);
}