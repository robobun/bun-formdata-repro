// This attempts to create FormData with malformed boundaries to trigger the error
// "FormData missing final boundary"

async function testMalformedBoundaries() {
    console.log("Testing various malformed boundary scenarios...");
    
    const testCases = [
        {
            name: "Missing final boundary marker",
            createRequest: () => {
                const boundary = "----formdata-boundary-test-123";
                const body = [
                    `------formdata-boundary-test-123`,
                    `Content-Disposition: form-data; name="test"`,
                    ``,
                    `value`,
                    `------formdata-boundary-test-123`,
                    `Content-Disposition: form-data; name="data"`,
                    ``,
                    `more-data`,
                    // Missing final boundary marker with --
                    ``
                ].join('\r\n');
                
                return new Request('http://localhost:3000', {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=----formdata-boundary-test-123`
                    },
                    body: body
                });
            }
        },
        {
            name: "Truncated boundary",
            createRequest: () => {
                const boundary = "----formdata-boundary-test-456";
                const body = [
                    `------formdata-boundary-test-456`,
                    `Content-Disposition: form-data; name="test"`,
                    ``,
                    `value`,
                    `------formdata-boundary-test-4` // Truncated boundary
                ].join('\r\n');
                
                return new Request('http://localhost:3000', {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=----formdata-boundary-test-456`
                    },
                    body: body
                });
            }
        },
        {
            name: "Boundary with wrong line endings",
            createRequest: () => {
                const boundary = "----formdata-boundary-test-789";
                const body = [
                    `------formdata-boundary-test-789`,
                    `Content-Disposition: form-data; name="test"`,
                    ``,
                    `value`,
                    `------formdata-boundary-test-789--` // Missing proper line ending
                ].join('\n'); // Wrong line ending (should be \r\n)
                
                return new Request('http://localhost:3000', {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=----formdata-boundary-test-789`
                    },
                    body: body
                });
            }
        },
        {
            name: "Empty body with boundary header",
            createRequest: () => {
                return new Request('http://localhost:3000', {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=----formdata-boundary-empty`
                    },
                    body: ""
                });
            }
        },
        {
            name: "Boundary mismatch in header vs body",
            createRequest: () => {
                const body = [
                    `------different-boundary-123`,
                    `Content-Disposition: form-data; name="test"`,
                    ``,
                    `value`,
                    `------different-boundary-123--`
                ].join('\r\n');
                
                return new Request('http://localhost:3000', {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=----header-boundary-456`
                    },
                    body: body
                });
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n=== Testing: ${testCase.name} ===`);
        
        try {
            const request = testCase.createRequest();
            
            // Test directly with Request.formData()
            try {
                const formData = await request.formData();
                console.log(`✅ Direct formData() succeeded for ${testCase.name}`);
                for (const [key, value] of formData.entries()) {
                    console.log(`  ${key}: ${value}`);
                }
            } catch (error) {
                console.log(`❌ Direct formData() failed for ${testCase.name}:`, error.message);
                if (error.message.includes('missing final boundary')) {
                    console.log(`🎯 FOUND IT! "${testCase.name}" triggers "missing final boundary" error`);
                }
            }
            
        } catch (error) {
            console.log(`💥 Request creation failed for ${testCase.name}:`, error.message);
        }
    }
}

async function testWithServer() {
    console.log("Testing malformed boundaries through server...");
    
    // Wait for server to be available
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const testCases = [
        {
            name: "Rapid concurrent requests with timing",
            test: async () => {
                const promises = [];
                for (let i = 0; i < 20; i++) {
                    const formData = new FormData();
                    formData.append('test', `concurrent-${i}`);
                    formData.append('timestamp', Date.now().toString());
                    
                    promises.push(
                        fetch('http://localhost:3000', {
                            method: 'POST',
                            body: formData
                        }).then(async response => {
                            const result = await response.text();
                            return { id: i, success: response.ok, result };
                        }).catch(error => ({ id: i, success: false, error: error.message }))
                    );
                }
                
                const results = await Promise.all(promises);
                const failures = results.filter(r => !r.success);
                
                console.log(`Concurrent test results: ${results.length - failures.length} success, ${failures.length} failures`);
                
                failures.forEach(f => {
                    console.log(`  Request ${f.id}: ${f.error || f.result}`);
                    if ((f.error || f.result || '').includes('missing final boundary')) {
                        console.log(`🎯 FOUND IT! Concurrent request ${f.id} triggered "missing final boundary" error`);
                    }
                });
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n=== Server Test: ${testCase.name} ===`);
        await testCase.test();
    }
}

if (import.meta.main) {
    console.log("Testing malformed FormData boundaries to reproduce 'missing final boundary' error");
    
    // Test direct FormData parsing first
    testMalformedBoundaries().then(() => {
        console.log("\n" + "=".repeat(60));
        return testWithServer();
    }).catch(console.error);
}