// Test the cloning/wrapper issue mentioned in comment by karemont
// This simulates what frameworks like SolidStart/SvelteKit might be doing

class HTTPRequest extends Request {
    message = 'Hello'
    constructor(input, init) {
        super(input, init);
    }
}

class RequestWrapper {
    constructor(req) {
        this.originalRequest = req;
        this.clonedRequest = req.clone();
    }
    
    async getFormData() {
        return await this.clonedRequest.formData();
    }
}

async function testClonedRequest(req) {
    console.log(`[${new Date().toISOString()}] Testing cloned request`);
    console.log('Original Content-Type:', req.headers.get('content-type'));
    
    try {
        // This simulates what frameworks do - clone the request
        const cloned = req.clone();
        console.log('Cloned Content-Type:', cloned.headers.get('content-type'));
        
        const formData = await cloned.formData();
        const result = Object.fromEntries(formData.entries());
        return new Response(JSON.stringify({ 
            success: true, 
            data: result, 
            test: 'cloned-request' 
        }));
    } catch (error) {
        console.error('Cloned request error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            test: 'cloned-request'
        }), { status: 500 });
    }
}

async function testWrappedRequest(req) {
    console.log(`[${new Date().toISOString()}] Testing wrapped request`);
    
    try {
        // This simulates creating a wrapper class like frameworks do
        const wrapped = new HTTPRequest(req);
        console.log('Wrapped Content-Type:', wrapped.headers.get('content-type'));
        
        const formData = await wrapped.formData();
        const result = Object.fromEntries(formData.entries());
        return new Response(JSON.stringify({ 
            success: true, 
            data: result, 
            test: 'wrapped-request'
        }));
    } catch (error) {
        console.error('Wrapped request error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            test: 'wrapped-request'
        }), { status: 500 });
    }
}

async function testDoubleWrapper(req) {
    console.log(`[${new Date().toISOString()}] Testing double wrapper`);
    
    try {
        // This simulates multiple levels of wrapping/cloning
        const wrapper = new RequestWrapper(req);
        const formData = await wrapper.getFormData();
        const result = Object.fromEntries(formData.entries());
        return new Response(JSON.stringify({ 
            success: true, 
            data: result, 
            test: 'double-wrapper'
        }));
    } catch (error) {
        console.error('Double wrapper error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            test: 'double-wrapper'
        }), { status: 500 });
    }
}

Bun.serve({
    port: 3002,
    async fetch(request) {
        console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
        
        if (request.method !== 'POST') {
            return new Response(`
                <html>
                <head><title>FormData Cloning Bug Test</title></head>
                <body>
                    <h1>FormData Request Cloning/Wrapping Bug Test</h1>
                    <p>This tests the issue where cloning or wrapping Request objects breaks FormData parsing.</p>
                    
                    <form action="/cloned" method="POST" enctype="multipart/form-data">
                        <h2>Test Cloned Request</h2>
                        <input type="text" name="test" value="cloned-test" />
                        <button type="submit">Submit to /cloned</button>
                    </form>
                    
                    <form action="/wrapped" method="POST" enctype="multipart/form-data">
                        <h2>Test Wrapped Request</h2>
                        <input type="text" name="test" value="wrapped-test" />
                        <button type="submit">Submit to /wrapped</button>
                    </form>
                    
                    <form action="/double-wrapper" method="POST" enctype="multipart/form-data">
                        <h2>Test Double Wrapper</h2>
                        <input type="text" name="test" value="double-wrapper-test" />
                        <button type="submit">Submit to /double-wrapper</button>
                    </form>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        const url = new URL(request.url);
        
        // Add some async delays like in the original issue
        await new Promise(resolve => setTimeout(resolve, 0));
        
        let response;
        switch (url.pathname) {
            case '/cloned':
                response = await testClonedRequest(request);
                break;
            case '/wrapped':
                response = await testWrappedRequest(request);
                break;
            case '/double-wrapper':
                response = await testDoubleWrapper(request);
                break;
            default:
                response = new Response('Not found', { status: 404 });
        }
        
        await new Promise(resolve => setTimeout(resolve, 0));
        return response;
    }
});

console.log('Cloning/wrapper test server running on http://localhost:3002');
console.log('This tests the issue where request cloning/wrapping breaks FormData parsing');