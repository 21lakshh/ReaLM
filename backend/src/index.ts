import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { encodeBase64 } from 'hono/utils/encode'
import { GoogleGenAI } from '@google/genai'
import { tavily } from '@tavily/core'

const app = new Hono<{
  Bindings: {
    GOOGLE_API_KEY: string
    TAVILY_API_KEY: string
  }
}>()

// Enable CORS for Chrome extension
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.get('/healthCheck', (c) => {
  return c.text('Server working perfectly fine!')
})

app.post('/verify-new', async (c) => {
  try {
    const genai = new GoogleGenAI({
      apiKey: c.env.GOOGLE_API_KEY,
    })
    const client = tavily({ apiKey: c.env.TAVILY_API_KEY })

    const formData = await c.req.formData()
    const file = formData.get('image')

    if (!file) {
      return c.json({ error: 'No image uploaded' }, 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Image = encodeBase64(arrayBuffer);

    const contents = [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
      {
        text: `
    You are an information extraction assistant.
    
    Given an image (such as a social media post or screenshot), do the following:
    1. Identify the main claim or statement being made (ignore metadata like usernames, dates, likes, retweets, sources, engagement metrics, etc.).
    2. Extract ONLY the core claim text - the actual factual statement or assertion.
    3. Rephrase that claim into a clear, neutral factual question suitable for a web search.
    4. Return your response in the following JSON format (plain JSON only, no markdown):
    
    {
      "extracted_claim": "<only the core claim text, no metadata>",
      "question": "<the rephrased factual question>"
    }
    
    Make sure the "question" field is specific and self-contained (no references like 'this post' or 'the image').
    Return ONLY the JSON object, nothing else.`
      }
    ]

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    })

    // Strip markdown code blocks if present
    const cleanText = (response.text ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const json = JSON.parse(cleanText)
    const question = json.question
    const claim = json.extracted_claim

    const websearchResults = await client.search(question, {
      includeAnswers: true,
    })

    // Format evidence from web search results
    const evidence = websearchResults.results
      .map((result, idx) =>
        `[${idx + 1}] ${result.title}\n${result.content}\nSource: ${result.url}`
      )
      .join('\n\n')

    const finalResponse = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `You are a fact-checking assistant. Your task is to verify claims against evidence from web searches.

**CLAIM:**
${claim}

**EVIDENCE FROM WEB SEARCH:**
${evidence}

**TAVILY ANSWER SUMMARY:**
${websearchResults.answer || 'No summary available'}

**INSTRUCTIONS:**
1. Carefully analyze the claim against the provided evidence.
2. Determine if the claim is factually correct or misinformation.
3. If the claim is INCORRECT or MISINFORMATION: Explain why it's false, what the actual facts are, and why it might be spreading misinformation.
4. If the claim is CORRECT: Provide detailed reasoning on why it's accurate based on the evidence, citing specific sources.
5. Consider the credibility of sources and consistency across multiple sources.
6. Return your response in the following JSON format (plain JSON only, no markdown):

{
  "validity": true or false,
  "response": "<detailed explanation of your verdict with reasoning and source references>"
}

Return ONLY the JSON object, nothing else.`
        }
      ]
    })

    // Strip markdown code blocks if present
    const cleanFinalText = (finalResponse.text ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const verificationResult = JSON.parse(cleanFinalText)

    return c.json({
      question,
      claim,
      validity: verificationResult.validity,
      response: verificationResult.response
    })
  } catch (error) {
    return c.json({ error: 'Failed to verify image' }, 500)
  }
})
export default app
