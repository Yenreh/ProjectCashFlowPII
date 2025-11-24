/**
 * Utilidades compartidas para testing
 * Framework de testing simple sin dependencias externas
 */

export function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
  } catch (error: any) {
    console.log(`[FAIL] ${name}`)
    console.log(`       ${error.message}`)
    process.exit(1)
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

export function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    )
  }
}

export function assertGreaterThan(value: number, min: number, message?: string) {
  if (value <= min) {
    throw new Error(message || `Expected ${value} > ${min}`)
  }
}

export function assertThrows(fn: () => void, expectedMessage?: string) {
  try {
    fn()
    throw new Error("Function should have thrown an error")
  } catch (error: any) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to include "${expectedMessage}", but got "${error.message}"`
      )
    }
  }
}
