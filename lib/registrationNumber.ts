import { supabaseAdmin } from '@/lib/supabase'

/**
 * Generates a unique 5-digit code for student registration numbers
 * Ensures uniqueness by checking against existing codes for the same course
 */
export async function generateUnique5DigitCode(courseCode: string): Promise<string> {
  let code: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 100

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 5-digit code
    code = String(Math.floor(Math.random() * 90000) + 10000)
    
    // Check if this exact registration number already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('student_id')
      .eq('student_id', `${courseCode}/${new Date().getFullYear()}/${code}`)
      .single()
    
    if (!existing) {
      isUnique = true
    }
    attempts++
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique registration number after multiple attempts')
  }

  return code!
}

/**
 * Generates a complete student registration number in the format: COURSE_CODE/YEAR_OF_STUDY/UNIQUE_5_DIGIT_CODE
 * Example: BSCCS/2022/43567
 */
export async function generateStudentRegistrationNumber(courseId: string, yearOfStudy: number): Promise<string> {
  try {
    // Fetch the unit to get its code
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select('code')
      .eq('id', courseId)
      .single()

    if (unitError || !unit) {
      throw new Error(`Unit not found: ${courseId}`)
    }

    const courseCode = unit.code

    // Generate unique 5-digit code
    const uniqueCode = await generateUnique5DigitCode(courseCode)

    // Format: COURSE_CODE/YEAR_OF_STUDY/UNIQUE_5_DIGIT_CODE
    const registrationNumber = `${courseCode}/${yearOfStudy}/${uniqueCode}`

    return registrationNumber
  } catch (error) {
    console.error('Failed to generate registration number:', error)
    throw error
  }
}

/**
 * Validates a manually entered registration number format
 */
export function validateRegistrationNumberFormat(studentId: string): { valid: boolean; error?: string } {
  const parts = studentId.split('/')
  
  if (parts.length !== 3) {
    return { valid: false, error: 'Registration number must have format: COURSE_CODE/YEAR/5_DIGIT_CODE' }
  }

  const [courseCode, year, code] = parts

  if (!courseCode || courseCode.length === 0) {
    return { valid: false, error: 'Course code cannot be empty' }
  }

  if (isNaN(parseInt(year))) {
    return { valid: false, error: 'Year must be a number' }
  }

  if (!/^\d{5}$/.test(code)) {
    return { valid: false, error: 'Unique code must be exactly 5 digits' }
  }

  return { valid: true }
}

/**
 * Parses a registration number and returns its components
 */
export function parseRegistrationNumber(studentId: string): { courseCode: string; year: number; code: string } | null {
  const validation = validateRegistrationNumberFormat(studentId)
  if (!validation.valid) return null

  const [courseCode, year, code] = studentId.split('/')
  return {
    courseCode,
    year: parseInt(year),
    code,
  }
}
