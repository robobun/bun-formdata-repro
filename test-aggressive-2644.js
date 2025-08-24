// Aggressive test to reproduce the FormData boundary issue
// Based on the SolidStart reproduction repo mentioned in comments

async function sendFormDataRequest(url, data, requestId) {
    const formData = new FormData();
    
    // Add various types of data
    formData.append('id', requestId.toString());
    formData.append('timestamp', new Date().toISOString());
    formData.append('data', JSON.stringify(data));
    
    // Add a file-like blob to make it more complex
    const blob = new Blob(['test file content for request ' + requestId], { type: 'text/plain' });
    formData.append('file', blob, `test-${requestId}.txt`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.text();
        return { 
            success: response.ok, 
            requestId, 
            result: response.ok ? JSON.parse(result) : result,
            status: response.status 
        };
    } catch (error) {
        return { 
            success: false, 
            requestId, 
            error: error.message 
        };
    }
}

async function aggressiveTest(url, numConcurrent = 50, numBatches = 5) {
    console.log(`Starting aggressive test: ${numBatches} batches of ${numConcurrent} concurrent requests`);
    
    const allResults = [];
    
    for (let batch = 0; batch < numBatches; batch++) {
        console.log(`\n=== Batch ${batch + 1}/${numBatches} ===`);
        
        const promises = [];
        for (let i = 0; i < numConcurrent; i++) {
            const requestId = batch * numConcurrent + i;
            const data = { batch, index: i, random: Math.random() };
            promises.push(sendFormDataRequest(url, data, requestId));
        }
        
        const batchResults = await Promise.all(promises);
        allResults.push(...batchResults);
        
        const batchSuccesses = batchResults.filter(r => r.success).length;
        const batchFailures = batchResults.filter(r => !r.success).length;
        
        console.log(`Batch ${batch + 1} results: ${batchSuccesses} successes, ${batchFailures} failures`);
        
        if (batchFailures > 0) {
            console.log('Failed requests in this batch:');
            batchResults.filter(r => !r.success).forEach(r => {
                console.log(`  Request ${r.requestId}: ${r.error || r.result}`);
            });
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allResults;
}

async function runTests() {
    console.log('Waiting for servers to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tests = [
        { name: 'Hono Server', url: 'http://localhost:3001/api/formdata' },
        { name: 'Cloning Server', url: 'http://localhost:3002/cloned' },
        { name: 'Wrapper Server', url: 'http://localhost:3002/wrapped' },
        { name: 'Double Wrapper Server', url: 'http://localhost:3002/double-wrapper' },
    ];
    
    for (const test of tests) {
        try {
            console.log(`\n🚀 Testing ${test.name} (${test.url})`);
            const results = await aggressiveTest(test.url, 20, 3);
            
            const successes = results.filter(r => r.success).length;
            const failures = results.filter(r => !r.success).length;
            
            console.log(`\n📊 ${test.name} Final Results:`);
            console.log(`   Total requests: ${results.length}`);
            console.log(`   Successes: ${successes}`);
            console.log(`   Failures: ${failures}`);
            console.log(`   Success rate: ${((successes / results.length) * 100).toFixed(2)}%`);
            
            if (failures > 0) {
                console.log(`\n❌ Failure examples for ${test.name}:`);
                const failureExamples = results.filter(r => !r.success).slice(0, 5);
                failureExamples.forEach(r => {
                    console.log(`   Request ${r.requestId}: ${r.error || (r.result?.error || r.result)}`);
                });
            }
            
        } catch (error) {
            console.error(`Failed to test ${test.name}:`, error.message);
        }
    }
}

if (import.meta.main) {
    runTests();
}