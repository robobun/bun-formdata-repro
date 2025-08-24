import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(`
    <html>
      <head><title>FormData Test</title></head>
      <body>
        <h1>FormData Boundary Issue Reproduction</h1>
        <form action="/submit" method="POST" enctype="multipart/form-data">
          <div>
            <label>Name: <input type="text" name="name" value="test-user" /></label>
          </div>
          <div>
            <label>File: <input type="file" name="file" /></label>
          </div>
          <div>
            <label>Message: <textarea name="message">This is a test message for FormData boundary issue</textarea></label>
          </div>
          <div>
            <button type="submit">Submit</button>
          </div>
        </form>
        
        <h2>API Test</h2>
        <button onclick="testFormData()">Send FormData via JS</button>
        <button onclick="testJson()">Send JSON via JS</button>
        <pre id="result"></pre>
        
        <script>
          async function testFormData() {
            const formData = new FormData();
            formData.append('test', 'value');
            formData.append('timestamp', new Date().toISOString());
            
            try {
              const response = await fetch('/api/formdata', {
                method: 'POST',
                body: formData
              });
              document.getElementById('result').textContent = await response.text();
            } catch (err) {
              document.getElementById('result').textContent = 'Error: ' + err.message;
            }
          }
          
          async function testJson() {
            try {
              const response = await fetch('/api/json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: 'value', timestamp: new Date().toISOString() })
              });
              document.getElementById('result').textContent = await response.text();
            } catch (err) {
              document.getElementById('result').textContent = 'Error: ' + err.message;
            }
          }
        </script>
      </body>
    </html>
  `)
})

app.post('/submit', async (c) => {
  try {
    console.log('Headers:', Object.fromEntries(c.req.header()))
    console.log('Content-Type:', c.req.header('content-type'))
    
    const formData = await c.req.formData()
    console.log('FormData parsed successfully')
    
    const result = {}
    for (const [key, value] of formData.entries()) {
      result[key] = value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Error parsing form data:', error)
    return c.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, 500)
  }
})

app.post('/api/formdata', async (c) => {
  try {
    console.log('API FormData - Headers:', Object.fromEntries(c.req.header()))
    console.log('API FormData - Content-Type:', c.req.header('content-type'))
    
    const formData = await c.req.formData()
    console.log('API FormData parsed successfully')
    
    const result = {}
    for (const [key, value] of formData.entries()) {
      result[key] = value
    }
    
    return c.json({ success: true, data: result, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('API FormData error:', error)
    return c.json({ 
      success: false, 
      error: error.message,
      type: error.constructor.name,
      stack: error.stack 
    }, 500)
  }
})

app.post('/api/json', async (c) => {
  try {
    const json = await c.req.json()
    return c.json({ success: true, data: json, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('API JSON error:', error)
    return c.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, 500)
  }
})

console.log('Starting Hono server on port 3001...')
console.log('Visit http://localhost:3001 to test FormData boundary issue')

export default {
  port: 3001,
  fetch: app.fetch,
}