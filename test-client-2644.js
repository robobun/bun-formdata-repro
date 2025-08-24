async function testFormDataSubmission() {
    console.log("Testing FormData submissions...");
    
    const results = [];
    const numRequests = 20; // Send multiple rapid requests
    
    for (let i = 0; i < numRequests; i++) {
        const formData = new FormData();
        formData.append('test', `value-${i}`);
        formData.append('index', i.toString());
        formData.append('timestamp', new Date().toISOString());
        
        try {
            console.log(`Sending request ${i + 1}/${numRequests}`);
            const response = await fetch('http://localhost:3000', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Request ${i + 1} success:`, data);
                results.push({ success: true, data, index: i });
            } else {
                const errorText = await response.text();
                console.log(`❌ Request ${i + 1} failed with status ${response.status}:`, errorText);
                results.push({ success: false, error: errorText, status: response.status, index: i });
            }
        } catch (error) {
            console.log(`💥 Request ${i + 1} threw error:`, error.message);
            results.push({ success: false, error: error.message, index: i });
        }
        
        // Small delay between requests to simulate rapid but not simultaneous requests
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log("\n=== SUMMARY ===");
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    console.log(`Successes: ${successes}`);
    console.log(`Failures: ${failures}`);
    
    if (failures > 0) {
        console.log("\nFailed requests:");
        results.filter(r => !r.success).forEach(r => {
            console.log(`  Request ${r.index + 1}: ${r.error}`);
        });
    }
    
    return results;
}

// Test different scenarios
async function runTests() {
    console.log("Starting FormData boundary bug reproduction tests...");
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        // Test 1: Rapid sequential requests
        console.log("\n=== Test 1: Rapid Sequential Requests ===");
        await testFormDataSubmission();
        
        // Test 2: Concurrent requests
        console.log("\n=== Test 2: Concurrent Requests ===");
        const concurrentPromises = [];
        for (let i = 0; i < 10; i++) {
            const formData = new FormData();
            formData.append('concurrent', `request-${i}`);
            
            concurrentPromises.push(
                fetch('http://localhost:3000', {
                    method: 'POST',
                    body: formData
                }).then(response => {
                    if (response.ok) {
                        return response.json().then(data => ({ success: true, data, index: i }));
                    } else {
                        return response.text().then(error => ({ success: false, error, status: response.status, index: i }));
                    }
                }).catch(error => ({ success: false, error: error.message, index: i }))
            );
        }
        
        const concurrentResults = await Promise.all(concurrentPromises);
        const concurrentSuccesses = concurrentResults.filter(r => r.success).length;
        const concurrentFailures = concurrentResults.filter(r => !r.success).length;
        
        console.log(`Concurrent - Successes: ${concurrentSuccesses}, Failures: ${concurrentFailures}`);
        if (concurrentFailures > 0) {
            concurrentResults.filter(r => !r.success).forEach(r => {
                console.log(`  Concurrent request ${r.index + 1}: ${r.error}`);
            });
        }
        
    } catch (error) {
        console.error("Test execution failed:", error);
    }
}

if (import.meta.main) {
    runTests();
}