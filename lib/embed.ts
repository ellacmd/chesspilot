export async function embedText(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Embedding error:', data)
    throw new Error(data?.error?.message || 'Embedding failed')
  }

  if (!data?.data?.[0]?.embedding) {
    console.error('Invalid embedding response:', data)
    throw new Error('Embedding response malformed')
  }

  return data.data[0].embedding
}