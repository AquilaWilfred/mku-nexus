import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/ai'

/**
 * Extracts raw text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import('pdf-parse')
    const pdfParse = (pdfModule as any).default ?? pdfModule
    const data = await pdfParse(buffer)
    return data.text || ''
  } catch (error) {
    console.error('[RAG] PDF Extraction failed:', error)
    return ''
  }
}

/**
 * Splits text into chunks and saves them to the database with vector embeddings
 */
export async function processAndStoreDocument(materialId: string, unitId: string, text: string) {
  if (!text || text.trim().length === 0) return

  // 1. Clean the text (remove excessive whitespaces/newlines)
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  // 2. Chunk the text (1,000 characters per chunk, with 200 chars of overlap)
  // Overlap is crucial so a sentence cut in half doesn't lose its meaning
  const CHUNK_SIZE = 1000
  const CHUNK_OVERLAP = 200
  const chunks: string[] = []
  
  for (let i = 0; i < cleanText.length; i += (CHUNK_SIZE - CHUNK_OVERLAP)) {
    chunks.push(cleanText.slice(i, i + CHUNK_SIZE))
    if (i + CHUNK_SIZE >= cleanText.length) break
  }

  // 3. Generate embeddings and save to database
  // We process these sequentially to avoid hitting API rate limits on Gemini
  for (const chunk of chunks) {
    if (chunk.length < 50) continue // Skip chunks that are too small to be meaningful
    
    try {
      const embedding = await generateEmbedding(chunk)
      
      await supabaseAdmin.from('material_chunks').insert({
        material_id: materialId,
        unit_id: unitId,
        content: chunk,
        embedding: embedding
      })
    } catch (error) {
      console.error(`[RAG] Failed to embed chunk for material ${materialId}:`, error)
    }
  }
}